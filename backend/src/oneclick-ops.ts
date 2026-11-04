import {
  getQuote,
  pollUntilSettled,
  submitDeposit,
  verifyQuote,
  type OneClickConfig,
  type QuoteRequest,
  type QuoteResponse,
  type StatusResponse,
} from "./pay/oneclick.js";

export interface OneClickOps {
  getQuote(req: QuoteRequest): Promise<QuoteResponse>;
  verifyQuote: typeof verifyQuote;
  submitDeposit(depositAddress: string, txHash: string): Promise<void>;
  pollUntilSettled(depositAddress: string, maxMinutes?: number): Promise<StatusResponse>;
}

export function createOneClickOps(cfg: OneClickConfig): OneClickOps {
  return {
    getQuote: (req) => getQuote(req, cfg),
    verifyQuote,
    submitDeposit: (depositAddress, txHash) => submitDeposit(depositAddress, txHash, cfg),
    pollUntilSettled: (depositAddress, maxMinutes) => pollUntilSettled(depositAddress, cfg, maxMinutes),
  };
}
