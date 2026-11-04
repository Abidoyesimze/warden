use near_sdk::json_types::{U128, U64};
use near_sdk::{near, AccountId};

/// An approved payout destination. The contract never accepts a destination
/// address as a call parameter — it is always read from here.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Vendor {
    pub name: String,
    pub dest_chain: String,
    pub dest_asset: String,
    pub dest_address: String,
    pub max_amount: U128,
    pub active: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PaymentStatus {
    Approved,
    Sending,
    Sent,
    Settled,
    Held,
    Rejected,
    Failed,
    Refunded,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Payment {
    pub id: u64,
    pub invoice_hash: String,
    pub vendor_id: String,
    pub amount: U128,
    pub flags: Vec<String>,
    pub attestation_hash: String,
    pub status: PaymentStatus,
    pub deposit_address: Option<AccountId>,
    pub quote_hash: Option<String>,
    pub intents_ref: Option<String>,
    // u64 nanosecond timestamps lose precision as plain JSON numbers once
    // read in JS/TS (beyond Number.MAX_SAFE_INTEGER); U64 serializes as a
    // JSON string instead, same reasoning as U128 for amounts.
    pub created_at: U64,
    pub updated_at: U64,
    pub note: Option<String>,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct Limits {
    pub auto_pay_limit: U128,
    pub per_tx_cap: U128,
    pub daily_cap: U128,
    pub spent_today: U128,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct Config {
    pub owner: AccountId,
    pub agent: AccountId,
    pub usdc_token: AccountId,
    pub limits: Limits,
    pub paused: bool,
}

/// Final outcome reported back by the backend once 1Click settles the
/// destination-chain leg. Matches the three terminal states in the spec.
#[near(serializers = [json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SettlementOutcome {
    Settled,
    Refunded,
    Failed,
}
