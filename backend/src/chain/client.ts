import { Account, JsonRpcProvider, KeyPairSigner, type KeyPairString } from "near-api-js";

export interface ChainConfig {
  rpcUrl: string;
  contractId: string;
  agentAccountId: string;
  agentPrivateKey: string;
}

export interface ViewCaller {
  callFunction(params: { contractId: string; method: string; args: Record<string, unknown> }): Promise<unknown>;
}

export interface RawCallResult {
  transaction_outcome: { id: string };
  status: "NotStarted" | "Started" | { Failure: unknown } | { SuccessValue: string };
}

export interface CallCaller {
  callFunctionRaw(params: {
    contractId: string;
    methodName: string;
    args: Record<string, unknown>;
    gas?: bigint;
    deposit?: bigint;
  }): Promise<RawCallResult>;
}

export interface ChainCallResult<T> {
  result: T;
  txHash: string;
}

const TGAS = 1_000_000_000_000n;

/**
 * Talks to the treasury contract as the agent account. The agent's key is
 * a function-call key scoped to propose_payment, execute_payment and
 * mark_settled only (see HACKATHON-NOTES.md) — everything else here is a
 * view call that needs no key at all.
 */
export class TreasuryChainClient {
  private readonly contractId: string;

  constructor(
    private readonly viewer: ViewCaller,
    private readonly caller: CallCaller,
    contractId: string,
  ) {
    this.contractId = contractId;
  }

  static fromConfig(cfg: ChainConfig): TreasuryChainClient {
    const provider = new JsonRpcProvider({ url: cfg.rpcUrl });
    const signer = KeyPairSigner.fromSecretKey(cfg.agentPrivateKey as KeyPairString);
    const agent = new Account(cfg.agentAccountId, provider, signer);
    return new TreasuryChainClient(provider, agent, cfg.contractId);
  }

  private async view<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
    const result = await this.viewer.callFunction({ contractId: this.contractId, method, args });
    if (result === undefined) throw new Error(`View call "${method}" returned no result`);
    return result as T;
  }

  private async call<T>(
    methodName: string,
    args: Record<string, unknown>,
    gasTgas: number,
    depositYocto = 0n,
  ): Promise<ChainCallResult<T>> {
    const raw = await this.caller.callFunctionRaw({
      contractId: this.contractId,
      methodName,
      args,
      gas: BigInt(gasTgas) * TGAS,
      deposit: depositYocto,
    });

    if (typeof raw.status === "object" && "Failure" in raw.status) {
      throw new Error(`${methodName} failed on-chain: ${JSON.stringify(raw.status.Failure)}`);
    }
    const successValue = typeof raw.status === "object" && "SuccessValue" in raw.status ? raw.status.SuccessValue : "";
    const decoded = successValue ? JSON.parse(Buffer.from(successValue, "base64").toString("utf-8")) : undefined;
    return { result: decoded as T, txHash: raw.transaction_outcome.id };
  }

  getConfig<T>(): Promise<T> {
    return this.view<T>("get_config");
  }

  getVendor<T>(id: string): Promise<T> {
    return this.view<T>("get_vendor", { id });
  }

  listVendors<T>(): Promise<T> {
    return this.view<T>("list_vendors");
  }

  getPayment<T>(id: number): Promise<T> {
    return this.view<T>("get_payment", { id });
  }

  listPayments<T>(from: number, limit: number): Promise<T> {
    return this.view<T>("list_payments", { from, limit });
  }

  /** ft_balance_of lives on the USDC token contract, not the treasury contract. */
  async ftBalanceOf(tokenContractId: string, accountId: string): Promise<string> {
    const result = await this.viewer.callFunction({
      contractId: tokenContractId,
      method: "ft_balance_of",
      args: { account_id: accountId },
    });
    return (result as string | undefined) ?? "0";
  }

  proposePayment<T>(args: {
    invoice_hash: string;
    vendor_id: string;
    amount: string;
    claimed_dest_hash: string;
    risk_flags: string[];
    attestation_hash: string;
  }): Promise<ChainCallResult<T>> {
    return this.call<T>("propose_payment", args, 50);
  }

  executePayment<T>(args: { id: number; deposit_address: string; quote_hash: string }): Promise<ChainCallResult<T>> {
    return this.call<T>("execute_payment", args, 150, 1n);
  }

  markSettled<T>(args: {
    id: number;
    outcome: "Settled" | "Refunded" | "Failed";
    intents_ref: string;
  }): Promise<ChainCallResult<T>> {
    return this.call<T>("mark_settled", args, 30);
  }
}
