import type { ChainCallResult } from "./client.js";
import type { ChainConfig, ChainPayment, ChainVendor } from "./mapping.js";

/** Subset of TreasuryChainClient the pipeline/routes depend on — lets tests inject a fake. */
export interface ChainOps {
  getConfig<T = ChainConfig>(): Promise<T>;
  getVendor<T = ChainVendor>(id: string): Promise<T>;
  listVendors<T = [string, ChainVendor][]>(): Promise<T>;
  getPayment<T = ChainPayment>(id: number): Promise<T>;
  listPayments<T = ChainPayment[]>(from: number, limit: number): Promise<T>;
  ftBalanceOf(tokenContractId: string, accountId: string): Promise<string>;
  proposePayment<T = ChainPayment>(args: {
    invoice_hash: string;
    vendor_id: string;
    amount: string;
    claimed_dest_hash: string;
    risk_flags: string[];
    attestation_hash: string;
  }): Promise<ChainCallResult<T>>;
  executePayment<T = unknown>(args: {
    id: number;
    deposit_address: string;
    quote_hash: string;
  }): Promise<ChainCallResult<T>>;
  markSettled<T = unknown>(args: {
    id: number;
    outcome: "Settled" | "Refunded" | "Failed";
    intents_ref: string;
  }): Promise<ChainCallResult<T>>;
}
