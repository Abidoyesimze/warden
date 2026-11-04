import { rawToDecimal } from "../money.js";
import type { ContractStatus, PaymentSummary, Treasury, Vendor } from "../types.js";

export interface ChainVendor {
  name: string;
  dest_chain: string;
  dest_asset: string;
  dest_address: string;
  max_amount: string;
  active: boolean;
}

export interface ChainLimits {
  auto_pay_limit: string;
  per_tx_cap: string;
  daily_cap: string;
  spent_today: string;
}

export interface ChainConfig {
  owner: string;
  agent: string;
  usdc_token: string;
  limits: ChainLimits;
  paused: boolean;
}

export interface ChainPayment {
  id: number;
  invoice_hash: string;
  vendor_id: string;
  amount: string;
  flags: string[];
  attestation_hash: string;
  status: ContractStatus;
  deposit_address: string | null;
  quote_hash: string | null;
  intents_ref: string | null;
  created_at: string;
  updated_at: string;
  note: string | null;
}

export function mapVendor(id: string, v: ChainVendor): Vendor {
  return {
    id,
    name: v.name,
    destChain: v.dest_chain,
    destAsset: v.dest_asset,
    destAddress: v.dest_address,
    maxAmount: rawToDecimal(v.max_amount),
    active: v.active,
  };
}

export function mapTreasury(
  contractId: string,
  balance: string,
  config: ChainConfig,
  vendors: [string, ChainVendor][],
): Treasury {
  return {
    contractId,
    ownerId: config.owner,
    agentId: config.agent,
    balance: rawToDecimal(balance),
    limits: {
      autoPayLimit: rawToDecimal(config.limits.auto_pay_limit),
      perTxCap: rawToDecimal(config.limits.per_tx_cap),
      dailyCap: rawToDecimal(config.limits.daily_cap),
      spentToday: rawToDecimal(config.limits.spent_today),
    },
    paused: config.paused,
    vendors: vendors.map(([id, v]) => mapVendor(id, v)),
  };
}

export function topFlag(flags: string[]): string | null {
  const first = flags[0];
  return first ? first.replace(/^BLOCK:/, "") : null;
}

export function mapPaymentSummary(
  p: ChainPayment,
  invoice: { id: string; invoiceNumber: string } | undefined,
  vendorName: string,
): PaymentSummary {
  return {
    id: p.id,
    invoiceId: invoice?.id ?? "",
    invoiceNumber: invoice?.invoiceNumber ?? "",
    vendorId: p.vendor_id || null,
    vendorName,
    amount: rawToDecimal(p.amount),
    status: p.status,
    flags: p.flags,
    topFlag: topFlag(p.flags),
    createdAt: new Date(Number(BigInt(p.created_at) / 1_000_000n)).toISOString(),
    updatedAt: new Date(Number(BigInt(p.updated_at) / 1_000_000n)).toISOString(),
  };
}
