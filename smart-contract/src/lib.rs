//! Warden treasury contract.
//!
//! Holds the business's USDC and is the only thing that can send it. The
//! agent can propose and execute payments, but every limit is re-checked
//! here, so a bug or a compromised agent cannot overspend or pay an address
//! that isn't in the vendor registry.

mod events;
mod types;

use borsh::BorshSerialize;
use near_sdk::json_types::{U128, U64};
use near_sdk::store::{IterableMap, LookupSet};
use near_sdk::{env, near, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault, Promise};

pub use types::{Config, Limits, Payment, PaymentStatus, SettlementOutcome, Vendor};

const NANOS_PER_DAY: u64 = 86_400_000_000_000;

// Placeholder gas budgets for the storage_deposit -> ft_transfer -> callback
// chain. Comfortably under the 300 Tgas a transaction carries by default;
// exact storage_deposit cost on the real USDC contract is confirmed in the
// Phase 1 manual spike (see HACKATHON-NOTES.md) before this runs for real.
const GAS_STORAGE_DEPOSIT: Gas = Gas::from_tgas(15);
const GAS_FT_TRANSFER: Gas = Gas::from_tgas(20);
const GAS_CALLBACK: Gas = Gas::from_tgas(15);
// Generous default storage_deposit amount; real NEP-141 tokens typically
// need far less (~0.00125 NEAR), refunded if unused.
const STORAGE_DEPOSIT_AMOUNT: NearToken = NearToken::from_millinear(10);

#[derive(BorshSerialize, BorshStorageKey)]
enum StorageKey {
    Vendors,
    Payments,
    SeenInvoices,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Treasury {
    owner: AccountId,
    agent: AccountId,
    usdc_token: AccountId,
    auto_pay_limit: u128,
    per_tx_cap: u128,
    daily_cap: u128,
    spent_today: u128,
    day_index: u64,
    paused: bool,
    vendors: IterableMap<String, Vendor>,
    payments: IterableMap<u64, Payment>,
    next_payment_id: u64,
    seen_invoices: LookupSet<String>,
}

#[near]
impl Treasury {
    #[init]
    pub fn new(
        owner: AccountId,
        agent: AccountId,
        usdc_token: AccountId,
        auto_pay_limit: U128,
        per_tx_cap: U128,
        daily_cap: U128,
    ) -> Self {
        Self {
            owner,
            agent,
            usdc_token,
            auto_pay_limit: auto_pay_limit.0,
            per_tx_cap: per_tx_cap.0,
            daily_cap: daily_cap.0,
            spent_today: 0,
            day_index: env::block_timestamp() / NANOS_PER_DAY,
            paused: false,
            vendors: IterableMap::new(StorageKey::Vendors),
            payments: IterableMap::new(StorageKey::Payments),
            next_payment_id: 0,
            seen_invoices: LookupSet::new(StorageKey::SeenInvoices),
        }
    }

    // ---------- NEP-141 receiver ----------

    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> U128 {
        let _ = msg;
        assert_eq!(
            env::predecessor_account_id(),
            self.usdc_token,
            "Only the configured USDC token can fund this treasury"
        );
        assert_eq!(sender_id, self.owner, "Only the owner can top up the treasury");
        let _ = amount;
        // Keep the full amount; nothing is refunded to the sender.
        U128(0)
    }

    // ---------- owner: vendor registry ----------

    pub fn upsert_vendor(&mut self, id: String, vendor: Vendor) {
        self.assert_owner();
        self.vendors.insert(id.clone(), vendor.clone());
        events::emit(
            "vendor_updated",
            &format!(r#"{{"vendor_id":"{}","active":{}}}"#, events::esc(&id), vendor.active),
        );
    }

    pub fn deactivate_vendor(&mut self, id: String) {
        self.assert_owner();
        let vendor = self.vendors.get_mut(&id).expect("Unknown vendor");
        vendor.active = false;
        events::emit(
            "vendor_updated",
            &format!(r#"{{"vendor_id":"{}","active":false}}"#, events::esc(&id)),
        );
    }

    // ---------- owner: config ----------

    pub fn set_limits(&mut self, auto_pay_limit: U128, per_tx_cap: U128, daily_cap: U128) {
        self.assert_owner();
        self.auto_pay_limit = auto_pay_limit.0;
        self.per_tx_cap = per_tx_cap.0;
        self.daily_cap = daily_cap.0;
        events::emit(
            "limits_updated",
            &format!(
                r#"{{"auto_pay_limit":"{}","per_tx_cap":"{}","daily_cap":"{}"}}"#,
                auto_pay_limit.0, per_tx_cap.0, daily_cap.0
            ),
        );
    }

    pub fn set_agent(&mut self, agent: AccountId) {
        self.assert_owner();
        self.agent = agent;
    }

    pub fn pause(&mut self) {
        self.assert_owner();
        self.paused = true;
        events::emit("paused", r#"{"paused":true}"#);
    }

    pub fn unpause(&mut self) {
        self.assert_owner();
        self.paused = false;
        events::emit("paused", r#"{"paused":false}"#);
    }

    // ---------- agent: propose ----------

    pub fn propose_payment(
        &mut self,
        invoice_hash: String,
        vendor_id: String,
        amount: U128,
        claimed_dest_hash: String,
        risk_flags: Vec<String>,
        attestation_hash: String,
    ) -> Payment {
        self.assert_agent();
        assert!(!self.paused, "Contract is paused");

        let amount = amount.0;
        self.roll_day();

        if self.seen_invoices.contains(&invoice_hash) {
            return self.record_payment(
                invoice_hash,
                vendor_id,
                amount,
                vec!["DUPLICATE_HASH".to_string()],
                attestation_hash,
                PaymentStatus::Rejected,
            );
        }
        self.seen_invoices.insert(invoice_hash.clone());

        if amount > self.per_tx_cap {
            return self.record_payment(
                invoice_hash,
                vendor_id,
                amount,
                vec!["OVER_HARD_CAP".to_string()],
                attestation_hash,
                PaymentStatus::Rejected,
            );
        }

        let vendor = self.vendors.get(&vendor_id).cloned();
        let vendor = match &vendor {
            Some(v) if v.active => v,
            _ => {
                return self.record_payment(
                    invoice_hash,
                    vendor_id,
                    amount,
                    vec!["UNKNOWN_VENDOR".to_string()],
                    attestation_hash,
                    PaymentStatus::Held,
                );
            }
        };

        let expected_hash = hex::encode(env::sha256(vendor.dest_address.as_bytes()));
        if claimed_dest_hash.to_lowercase() != expected_hash {
            return self.record_payment(
                invoice_hash,
                vendor_id,
                amount,
                vec!["DEST_MISMATCH".to_string()],
                attestation_hash,
                PaymentStatus::Held,
            );
        }

        let mut flags = risk_flags;
        if amount > vendor.max_amount.0 {
            flags.push("OVER_VENDOR_MAX".to_string());
        }
        if amount > self.auto_pay_limit {
            flags.push("OVER_AUTO_PAY_LIMIT".to_string());
        }
        if self.spent_today + amount > self.daily_cap {
            flags.push("OVER_DAILY_CAP".to_string());
        }

        let status = if flags.is_empty() {
            PaymentStatus::Approved
        } else if flags.iter().any(|f| f.starts_with("BLOCK:")) {
            PaymentStatus::Rejected
        } else {
            PaymentStatus::Held
        };

        self.record_payment(invoice_hash, vendor_id, amount, flags, attestation_hash, status)
    }

    // ---------- agent: execute ----------

    pub fn execute_payment(&mut self, id: u64, deposit_address: AccountId, quote_hash: String) -> Promise {
        self.assert_agent();
        assert!(!self.paused, "Contract is paused");

        let amount = {
            let payment = self.payments.get(&id).expect("Unknown payment");
            assert_eq!(payment.status, PaymentStatus::Approved, "Payment is not Approved");
            payment.amount.0
        };

        self.roll_day();
        assert!(amount <= self.per_tx_cap, "Exceeds per-transaction cap");
        assert!(
            self.spent_today + amount <= self.daily_cap,
            "Would exceed daily cap"
        );

        self.spent_today += amount;
        {
            let payment = self.payments.get_mut(&id).unwrap();
            payment.status = PaymentStatus::Sending;
            payment.deposit_address = Some(deposit_address.clone());
            payment.quote_hash = Some(quote_hash);
            payment.updated_at = U64(env::block_timestamp());
        }
        events::emit(
            "payment_sending",
            &format!(r#"{{"id":{},"deposit_address":"{}"}}"#, id, deposit_address),
        );

        Promise::new(self.usdc_token.clone())
            .function_call(
                "storage_deposit".to_string(),
                format!(r#"{{"account_id":"{}"}}"#, deposit_address).into_bytes(),
                STORAGE_DEPOSIT_AMOUNT,
                GAS_STORAGE_DEPOSIT,
            )
            .then(
                Promise::new(self.usdc_token.clone()).function_call(
                    "ft_transfer".to_string(),
                    format!(r#"{{"receiver_id":"{}","amount":"{}"}}"#, deposit_address, amount).into_bytes(),
                    NearToken::from_yoctonear(1),
                    GAS_FT_TRANSFER,
                ),
            )
            .then(
                Promise::new(env::current_account_id()).function_call(
                    "on_transfer_complete".to_string(),
                    format!(r#"{{"id":{},"amount":"{}"}}"#, id, amount).into_bytes(),
                    NearToken::from_near(0),
                    GAS_CALLBACK,
                ),
            )
    }

    #[private]
    pub fn on_transfer_complete(&mut self, id: u64, amount: U128) -> bool {
        let success = env::promise_result_checked(0, 1024).is_ok();
        self.finalize_execute(id, amount.0, success);
        success
    }

    // ---------- agent: settle ----------

    pub fn mark_settled(&mut self, id: u64, outcome: SettlementOutcome, intents_ref: String) {
        self.assert_agent();
        let payment = self.payments.get_mut(&id).expect("Unknown payment");
        assert_eq!(payment.status, PaymentStatus::Sent, "Payment is not Sent");

        payment.status = match outcome {
            SettlementOutcome::Settled => PaymentStatus::Settled,
            SettlementOutcome::Refunded => PaymentStatus::Refunded,
            SettlementOutcome::Failed => PaymentStatus::Failed,
        };
        payment.intents_ref = Some(intents_ref.clone());
        payment.updated_at = U64(env::block_timestamp());

        events::emit(
            "payment_settled",
            &format!(
                r#"{{"id":{},"status":"{:?}","intents_ref":"{}"}}"#,
                id,
                payment.status,
                events::esc(&intents_ref)
            ),
        );
    }

    // ---------- owner: approve / reject ----------

    pub fn approve_payment(&mut self, id: u64) {
        self.assert_owner();
        let vendor_id = {
            let payment = self.payments.get(&id).expect("Unknown payment");
            assert_eq!(payment.status, PaymentStatus::Held, "Payment is not Held");
            payment.vendor_id.clone()
        };
        let vendor_ok = self.vendors.get(&vendor_id).is_some_and(|v| v.active);
        assert!(vendor_ok, "Vendor is no longer active");

        let payment = self.payments.get_mut(&id).unwrap();
        payment.status = PaymentStatus::Approved;
        payment.updated_at = U64(env::block_timestamp());
        events::emit("payment_approved", &format!(r#"{{"id":{}}}"#, id));
    }

    pub fn reject_payment(&mut self, id: u64, reason: String) {
        self.assert_owner();
        let payment = self.payments.get_mut(&id).expect("Unknown payment");
        assert_eq!(payment.status, PaymentStatus::Held, "Payment is not Held");
        payment.status = PaymentStatus::Rejected;
        payment.note = Some(reason.clone());
        payment.updated_at = U64(env::block_timestamp());
        events::emit(
            "payment_rejected",
            &format!(r#"{{"id":{},"reason":"{}"}}"#, id, events::esc(&reason)),
        );
    }

    // ---------- owner: escape hatch ----------

    pub fn withdraw(&mut self, amount: U128) -> Promise {
        self.assert_owner();
        Promise::new(self.usdc_token.clone()).function_call(
            "ft_transfer".to_string(),
            format!(r#"{{"receiver_id":"{}","amount":"{}"}}"#, self.owner, amount.0).into_bytes(),
            NearToken::from_yoctonear(1),
            GAS_FT_TRANSFER,
        )
    }

    // ---------- views ----------

    pub fn get_config(&self) -> Config {
        let spent_today = if self.current_day() == self.day_index {
            self.spent_today
        } else {
            0
        };
        Config {
            owner: self.owner.clone(),
            agent: self.agent.clone(),
            usdc_token: self.usdc_token.clone(),
            limits: Limits {
                auto_pay_limit: U128(self.auto_pay_limit),
                per_tx_cap: U128(self.per_tx_cap),
                daily_cap: U128(self.daily_cap),
                spent_today: U128(spent_today),
            },
            paused: self.paused,
        }
    }

    pub fn get_vendor(&self, id: String) -> Option<Vendor> {
        self.vendors.get(&id).cloned()
    }

    pub fn list_vendors(&self) -> Vec<(String, Vendor)> {
        self.vendors.iter().map(|(k, v)| (k.clone(), v.clone())).collect()
    }

    pub fn get_payment(&self, id: u64) -> Option<Payment> {
        self.payments.get(&id).cloned()
    }

    pub fn list_payments(&self, from: u64, limit: u64) -> Vec<Payment> {
        if self.next_payment_id == 0 || from >= self.next_payment_id {
            return vec![];
        }
        let newest = self.next_payment_id - 1;
        let start = newest.saturating_sub(from);
        let mut out = Vec::new();
        let mut cursor = start;
        loop {
            if let Some(p) = self.payments.get(&cursor) {
                out.push(p.clone());
            }
            if out.len() as u64 >= limit || cursor == 0 {
                break;
            }
            cursor -= 1;
        }
        out
    }
}

// ---------- internal helpers (not contract entry points) ----------

impl Treasury {
    fn assert_owner(&self) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Only the owner");
    }

    fn assert_agent(&self) {
        assert_eq!(env::predecessor_account_id(), self.agent, "Only the agent");
    }

    fn current_day(&self) -> u64 {
        env::block_timestamp() / NANOS_PER_DAY
    }

    fn roll_day(&mut self) {
        let day = self.current_day();
        if day != self.day_index {
            self.day_index = day;
            self.spent_today = 0;
        }
    }

    fn record_payment(
        &mut self,
        invoice_hash: String,
        vendor_id: String,
        amount: u128,
        flags: Vec<String>,
        attestation_hash: String,
        status: PaymentStatus,
    ) -> Payment {
        let id = self.next_payment_id;
        self.next_payment_id += 1;
        let now = U64(env::block_timestamp());

        let payment = Payment {
            id,
            invoice_hash,
            vendor_id,
            amount: U128(amount),
            flags,
            attestation_hash,
            status,
            deposit_address: None,
            quote_hash: None,
            intents_ref: None,
            created_at: now,
            updated_at: now,
            note: None,
        };
        self.payments.insert(id, payment.clone());

        let event = match status {
            PaymentStatus::Approved => "payment_proposed",
            PaymentStatus::Held => "payment_held",
            PaymentStatus::Rejected => "payment_rejected",
            _ => unreachable!("propose_payment only produces Approved, Held or Rejected"),
        };
        events::emit(
            event,
            &format!(
                r#"{{"id":{},"amount":"{}","flags":{}}}"#,
                id,
                payment.amount.0,
                events::str_array(&payment.flags)
            ),
        );

        payment
    }

    /// Shared by the real on_transfer_complete callback and unit tests:
    /// the callback only needs to learn `success` from the host, this does
    /// the actual bookkeeping.
    fn finalize_execute(&mut self, id: u64, amount: u128, success: bool) {
        let payment = self.payments.get_mut(&id).expect("Unknown payment");
        payment.updated_at = U64(env::block_timestamp());
        if success {
            payment.status = PaymentStatus::Sent;
            events::emit("payment_sent", &format!(r#"{{"id":{}}}"#, id));
        } else {
            payment.status = PaymentStatus::Approved;
            self.spent_today = self.spent_today.saturating_sub(amount);
            events::emit("payment_failed", &format!(r#"{{"id":{}}}"#, id));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn acc(s: &str) -> AccountId {
        s.parse().unwrap()
    }

    fn ctx(predecessor: &str) -> VMContextBuilder {
        let mut b = VMContextBuilder::new();
        b.predecessor_account_id(acc(predecessor));
        b
    }

    fn set_up() -> Treasury {
        testing_env!(ctx("owner.near").build());
        let mut c = Treasury::new(
            acc("owner.near"),
            acc("agent.near"),
            acc("usdc.near"),
            U128(2_000_000),  // auto_pay_limit: $2
            U128(10_000_000), // per_tx_cap: $10
            U128(50_000_000), // daily_cap: $50
        );
        c.upsert_vendor(
            "shenzhen-pack".to_string(),
            Vendor {
                name: "Shenzhen Packaging Co.".to_string(),
                dest_chain: "base".to_string(),
                dest_asset: "usdc".to_string(),
                dest_address: "0x5c1f0000000000000000000000000000003c7".to_string(),
                max_amount: U128(5_000_000),
                active: true,
            },
        );
        c
    }

    fn dest_hash(addr: &str) -> String {
        hex::encode(near_sdk::env::sha256(addr.as_bytes()))
    }

    fn propose_as_agent(c: &mut Treasury, amount: u128, flags: Vec<String>) -> Payment {
        testing_env!(ctx("agent.near").build());
        c.propose_payment(
            "hash-1".to_string(),
            "shenzhen-pack".to_string(),
            U128(amount),
            dest_hash("0x5c1f0000000000000000000000000000003c7"),
            flags,
            "attestation-1".to_string(),
        )
    }

    #[test]
    fn init_sets_roles() {
        let c = set_up();
        assert_eq!(c.get_config().owner, acc("owner.near"));
        assert_eq!(c.get_config().agent, acc("agent.near"));
    }

    #[test]
    fn auto_approves_under_limit() {
        let mut c = set_up();
        let p = propose_as_agent(&mut c, 1_000_000, vec![]);
        assert_eq!(p.status, PaymentStatus::Approved);
    }

    #[test]
    fn holds_over_auto_pay_limit() {
        let mut c = set_up();
        let p = propose_as_agent(&mut c, 3_000_000, vec![]);
        assert_eq!(p.status, PaymentStatus::Held);
        assert!(p.flags.contains(&"OVER_AUTO_PAY_LIMIT".to_string()));
    }

    #[test]
    fn rejects_over_hard_cap() {
        let mut c = set_up();
        let p = propose_as_agent(&mut c, 20_000_000, vec![]);
        assert_eq!(p.status, PaymentStatus::Rejected);
        assert!(p.flags.contains(&"OVER_HARD_CAP".to_string()));
    }

    #[test]
    fn holds_unknown_vendor() {
        let mut c = set_up();
        testing_env!(ctx("agent.near").build());
        let p = c.propose_payment(
            "hash-2".to_string(),
            "ghost-vendor".to_string(),
            U128(1_000_000),
            "deadbeef".to_string(),
            vec![],
            "attestation-2".to_string(),
        );
        assert_eq!(p.status, PaymentStatus::Held);
        assert!(p.flags.contains(&"UNKNOWN_VENDOR".to_string()));
    }

    #[test]
    fn holds_dest_mismatch() {
        let mut c = set_up();
        testing_env!(ctx("agent.near").build());
        let p = c.propose_payment(
            "hash-3".to_string(),
            "shenzhen-pack".to_string(),
            U128(1_000_000),
            dest_hash("0xbadbadbadbadbadbadbadbadbadbadbadbadbad"),
            vec![],
            "attestation-3".to_string(),
        );
        assert_eq!(p.status, PaymentStatus::Held);
        assert!(p.flags.contains(&"DEST_MISMATCH".to_string()));
    }

    #[test]
    fn rejects_block_flag() {
        let mut c = set_up();
        let p = propose_as_agent(&mut c, 1_000_000, vec!["BLOCK:DUPLICATE_NUMBER".to_string()]);
        assert_eq!(p.status, PaymentStatus::Rejected);
    }

    #[test]
    fn duplicate_hash_rejected() {
        let mut c = set_up();
        let first = propose_as_agent(&mut c, 1_000_000, vec![]);
        assert_eq!(first.status, PaymentStatus::Approved);

        testing_env!(ctx("agent.near").build());
        let second = c.propose_payment(
            "hash-1".to_string(), // same hash as propose_as_agent used
            "shenzhen-pack".to_string(),
            U128(1_000_000),
            dest_hash("0x5c1f0000000000000000000000000000003c7"),
            vec![],
            "attestation-dup".to_string(),
        );
        assert_eq!(second.status, PaymentStatus::Rejected);
        assert!(second.flags.contains(&"DUPLICATE_HASH".to_string()));
    }

    #[test]
    #[should_panic(expected = "Only the owner")]
    fn agent_cannot_call_owner_methods() {
        let mut c = set_up();
        testing_env!(ctx("agent.near").build());
        c.pause();
    }

    #[test]
    #[should_panic(expected = "Only the agent")]
    fn owner_cannot_call_agent_methods() {
        let mut c = set_up();
        testing_env!(ctx("owner.near").build());
        c.propose_payment(
            "h".to_string(),
            "shenzhen-pack".to_string(),
            U128(1),
            "x".to_string(),
            vec![],
            "a".to_string(),
        );
    }

    #[test]
    fn owner_approve_then_execute_moves_to_sending() {
        let mut c = set_up();
        let p = propose_as_agent(&mut c, 3_000_000, vec![]); // held (over auto-pay)
        assert_eq!(p.status, PaymentStatus::Held);

        testing_env!(ctx("owner.near").build());
        c.approve_payment(p.id);
        assert_eq!(c.get_payment(p.id).unwrap().status, PaymentStatus::Approved);

        testing_env!(ctx("agent.near").build());
        let _ = c.execute_payment(p.id, acc("deposit.near"), "quote-1".to_string());
        assert_eq!(c.get_payment(p.id).unwrap().status, PaymentStatus::Sending);
        assert_eq!(c.get_config().limits.spent_today.0, 3_000_000);
    }

    #[test]
    #[should_panic(expected = "Payment is not Approved")]
    fn execute_on_held_fails() {
        let mut c = set_up();
        let p = propose_as_agent(&mut c, 3_000_000, vec![]); // held
        testing_env!(ctx("agent.near").build());
        let _ = c.execute_payment(p.id, acc("deposit.near"), "quote-1".to_string());
    }

    #[test]
    #[should_panic(expected = "Would exceed daily cap")]
    fn daily_cap_enforced_at_execute() {
        let mut c = set_up();
        testing_env!(ctx("owner.near").build());
        // Raise auto-pay/per-tx so both payments are Approved at propose time;
        // only the daily cap should bite, and only once execution reserves spend.
        c.set_limits(U128(100_000_000), U128(100_000_000), U128(5_000_000));
        c.upsert_vendor(
            "shenzhen-pack".to_string(),
            Vendor {
                name: "Shenzhen Packaging Co.".to_string(),
                dest_chain: "base".to_string(),
                dest_asset: "usdc".to_string(),
                dest_address: "0x5c1f0000000000000000000000000000003c7".to_string(),
                max_amount: U128(100_000_000),
                active: true,
            },
        );

        testing_env!(ctx("agent.near").build());
        let dest = dest_hash("0x5c1f0000000000000000000000000000003c7");
        let a = c.propose_payment(
            "hash-a".to_string(),
            "shenzhen-pack".to_string(),
            U128(3_000_000),
            dest.clone(),
            vec![],
            "attestation-a".to_string(),
        );
        let b = c.propose_payment(
            "hash-b".to_string(),
            "shenzhen-pack".to_string(),
            U128(3_000_000),
            dest,
            vec![],
            "attestation-b".to_string(),
        );
        assert_eq!(a.status, PaymentStatus::Approved);
        assert_eq!(b.status, PaymentStatus::Approved);

        let _ = c.execute_payment(a.id, acc("deposit.near"), "quote-a".to_string());
        assert_eq!(c.get_config().limits.spent_today.0, 3_000_000);
        // Second execute pushes spent_today to 6,000,000 > daily_cap 5,000,000.
        let _ = c.execute_payment(b.id, acc("deposit.near"), "quote-b".to_string());
    }

    #[test]
    fn failed_transfer_reverts_status_and_spent_today() {
        let mut c = set_up();
        let p = propose_as_agent(&mut c, 1_000_000, vec![]);
        testing_env!(ctx("agent.near").build());
        let _ = c.execute_payment(p.id, acc("deposit.near"), "quote-3".to_string());
        assert_eq!(c.get_config().limits.spent_today.0, 1_000_000);

        c.finalize_execute(p.id, 1_000_000, false);
        assert_eq!(c.get_payment(p.id).unwrap().status, PaymentStatus::Approved);
        assert_eq!(c.get_config().limits.spent_today.0, 0);
    }

    #[test]
    fn successful_transfer_marks_sent() {
        let mut c = set_up();
        let p = propose_as_agent(&mut c, 1_000_000, vec![]);
        testing_env!(ctx("agent.near").build());
        let _ = c.execute_payment(p.id, acc("deposit.near"), "quote-4".to_string());
        c.finalize_execute(p.id, 1_000_000, true);
        assert_eq!(c.get_payment(p.id).unwrap().status, PaymentStatus::Sent);
    }
}
