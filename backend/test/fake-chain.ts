import type { VendorRecord } from "@warden/agent";
import type { ChainCallResult } from "../src/chain/client.js";
import type { ChainConfig, ChainPayment, ChainVendor } from "../src/chain/mapping.js";
import type { ChainOps } from "../src/chain/types.js";
import { decimalToRaw } from "../src/money.js";
import type { ContractStatus } from "../src/types.js";

/**
 * A lightweight stand-in for the treasury contract. It mimics just enough
 * of the real decision logic (see smart-contract/src/lib.rs, already
 * covered by its own 15 unit tests) to drive the backend pipeline/routes
 * end to end without a deployed contract or real keys.
 */
export class FakeChain implements ChainOps {
  payments = new Map<number, ChainPayment>();
  vendors = new Map<string, ChainVendor>();
  nextId = 0;
  config: ChainConfig;
  balance = "10000000";

  constructor(vendors: VendorRecord[], limits?: Partial<ChainConfig["limits"]>) {
    for (const v of vendors) {
      this.vendors.set(v.id, {
        name: v.name,
        dest_chain: v.destChain,
        dest_asset: v.destAsset,
        dest_address: v.destAddress,
        max_amount: decimalToRaw(v.maxAmount),
        active: v.active,
      });
    }
    this.config = {
      owner: "owner.near",
      agent: "agent.near",
      usdc_token: "usdc.near",
      paused: false,
      limits: {
        auto_pay_limit: decimalToRaw("2.00"),
        per_tx_cap: decimalToRaw("10.00"),
        daily_cap: decimalToRaw("50.00"),
        spent_today: "0",
        ...limits,
      },
    };
  }

  async getConfig<T>(): Promise<T> {
    return this.config as unknown as T;
  }

  async getVendor<T>(id: string): Promise<T> {
    return (this.vendors.get(id) ?? null) as unknown as T;
  }

  async listVendors<T>(): Promise<T> {
    return [...this.vendors.entries()] as unknown as T;
  }

  async getPayment<T>(id: number): Promise<T> {
    const p = this.payments.get(id);
    if (!p) throw new Error(`Unknown payment ${id}`);
    return p as unknown as T;
  }

  async listPayments<T>(_from: number, limit: number): Promise<T> {
    return [...this.payments.values()].reverse().slice(0, limit) as unknown as T;
  }

  async ftBalanceOf(): Promise<string> {
    return this.balance;
  }

  async proposePayment<T>(args: {
    invoice_hash: string;
    vendor_id: string;
    amount: string;
    claimed_dest_hash: string;
    risk_flags: string[];
    attestation_hash: string;
  }): Promise<ChainCallResult<T>> {
    const id = this.nextId++;
    const vendor = this.vendors.get(args.vendor_id) ?? null;
    let status: ContractStatus;
    const flags = [...args.risk_flags];

    if (!vendor || !vendor.active) {
      status = "Held";
      flags.push("UNKNOWN_VENDOR");
    } else if (BigInt(args.amount) > BigInt(this.config.limits.per_tx_cap)) {
      status = "Rejected";
      flags.length = 0;
      flags.push("OVER_HARD_CAP");
    } else if (flags.some((f) => f.startsWith("BLOCK:"))) {
      status = "Rejected";
    } else if (flags.length > 0) {
      status = "Held";
    } else if (BigInt(args.amount) > BigInt(vendor.max_amount)) {
      status = "Held";
      flags.push("OVER_VENDOR_MAX");
    } else if (BigInt(args.amount) > BigInt(this.config.limits.auto_pay_limit)) {
      status = "Held";
      flags.push("OVER_AUTO_PAY_LIMIT");
    } else {
      status = "Approved";
    }

    const now = String(Date.now() * 1_000_000);
    const payment: ChainPayment = {
      id,
      invoice_hash: args.invoice_hash,
      vendor_id: args.vendor_id,
      amount: args.amount,
      flags,
      attestation_hash: args.attestation_hash,
      status,
      deposit_address: null,
      quote_hash: null,
      intents_ref: null,
      created_at: now,
      updated_at: now,
      note: null,
    };
    this.payments.set(id, payment);
    return { result: payment as unknown as T, txHash: `fake-tx-propose-${id}` };
  }

  async executePayment<T>(args: { id: number; deposit_address: string; quote_hash: string }): Promise<ChainCallResult<T>> {
    const p = this.payments.get(args.id);
    if (!p) throw new Error(`Unknown payment ${args.id}`);
    if (p.status !== "Approved") throw new Error("Payment is not Approved");
    p.deposit_address = args.deposit_address;
    p.quote_hash = args.quote_hash;
    p.status = "Sent";
    return { result: undefined as unknown as T, txHash: `fake-tx-execute-${args.id}` };
  }

  async markSettled<T>(args: {
    id: number;
    outcome: "Settled" | "Refunded" | "Failed";
    intents_ref: string;
  }): Promise<ChainCallResult<T>> {
    const p = this.payments.get(args.id);
    if (!p) throw new Error(`Unknown payment ${args.id}`);
    p.status = args.outcome;
    p.intents_ref = args.intents_ref;
    return { result: undefined as unknown as T, txHash: `fake-tx-settle-${args.id}` };
  }

  /** Test helper: owner-signed approve_payment, called directly from the wallet in real life. */
  approve(id: number): void {
    const p = this.payments.get(id);
    if (!p) throw new Error(`Unknown payment ${id}`);
    if (p.status !== "Held") throw new Error("Payment is not Held");
    p.status = "Approved";
  }
}
