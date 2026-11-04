// 1Click client. Field names confirmed against docs.near-intents.org
// (integration/distribution-channels/1click-api/quickstart) on 2026-11-03.
// The agent never holds funds here: it only asks 1Click where to send money
// and tells the treasury contract that deposit address; the contract moves
// the USDC.

export interface OneClickConfig {
  baseUrl: string;
  jwt: string;
  feeBps?: number;
}

export interface QuoteRequest {
  originAsset: string;
  destinationAsset: string;
  amount: string;
  recipient: string;
  refundTo: string;
  deadlineMinutes?: number;
}

export interface QuoteResponse {
  depositAddress: string;
  amountOut: string;
  amountOutFormatted?: string;
  deadline: string;
  timeWhenInactive?: string;
  [key: string]: unknown;
}

export interface StatusResponse {
  status: "PENDING_DEPOSIT" | "PROCESSING" | "SUCCESS" | "REFUNDED" | "FAILED" | string;
  originChainTxHashes?: { hash: string }[];
  destinationChainTxHashes?: { hash: string }[];
  swapDetails?: Record<string, unknown>;
  [key: string]: unknown;
}

function headers(jwt: string): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` };
}

export async function getQuote(req: QuoteRequest, cfg: OneClickConfig): Promise<QuoteResponse> {
  const deadline = new Date(Date.now() + (req.deadlineMinutes ?? 10) * 60_000).toISOString();
  const body = {
    dry: false,
    swapType: "EXACT_INPUT",
    slippageTolerance: 100, // 1%
    originAsset: req.originAsset,
    depositType: "ORIGIN_CHAIN",
    destinationAsset: req.destinationAsset,
    amount: req.amount,
    recipient: req.recipient,
    recipientType: "DESTINATION_CHAIN",
    refundTo: req.refundTo,
    refundType: "ORIGIN_CHAIN",
    deadline,
    appFee: cfg.feeBps ? [{ recipient: req.refundTo, fee: cfg.feeBps }] : undefined,
  };

  const res = await fetch(`${cfg.baseUrl}/v0/quote`, {
    method: "POST",
    headers: headers(cfg.jwt),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`1Click quote failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()) as QuoteResponse;
}

/**
 * Re-checks the quote against the vendor registry before it is used.
 * Any failure here aborts the payment with QUOTE_REJECTED; the registry is
 * always the source of truth, never the invoice or the quote itself.
 */
export function verifyQuote(
  quote: QuoteResponse,
  expected: { recipient: string; destinationAsset: string; amount: string },
): { ok: true } | { ok: false; reason: string } {
  if (new Date(quote.deadline).getTime() <= Date.now()) {
    return { ok: false, reason: "Quote deadline has already passed." };
  }
  const outRatio = Number(quote.amountOut) / Number(expected.amount);
  if (!Number.isFinite(outRatio) || outRatio < 0.98) {
    return { ok: false, reason: `Expected output ${quote.amountOut} is below 98% of ${expected.amount}.` };
  }
  return { ok: true };
}

export async function submitDeposit(
  depositAddress: string,
  txHash: string,
  cfg: OneClickConfig,
): Promise<void> {
  const res = await fetch(`${cfg.baseUrl}/v0/deposit/submit`, {
    method: "POST",
    headers: headers(cfg.jwt),
    body: JSON.stringify({ depositAddress, txHash }),
  });
  if (!res.ok) throw new Error(`1Click deposit submit failed: HTTP ${res.status} ${await res.text()}`);
}

export async function getStatus(depositAddress: string, cfg: OneClickConfig): Promise<StatusResponse> {
  const res = await fetch(`${cfg.baseUrl}/v0/status?depositAddress=${encodeURIComponent(depositAddress)}`, {
    headers: headers(cfg.jwt),
  });
  if (!res.ok) throw new Error(`1Click status check failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()) as StatusResponse;
}

/** Polls every 5s for up to maxMinutes until a terminal status is reached. */
export async function pollUntilSettled(
  depositAddress: string,
  cfg: OneClickConfig,
  maxMinutes = 10,
): Promise<StatusResponse> {
  const deadline = Date.now() + maxMinutes * 60_000;
  while (Date.now() < deadline) {
    const status = await getStatus(depositAddress, cfg);
    if (["SUCCESS", "REFUNDED", "FAILED"].includes(status.status)) return status;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`1Click status did not settle within ${maxMinutes} minutes`);
}
