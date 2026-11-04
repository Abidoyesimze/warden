import { createHash } from "node:crypto";

// Endpoints and field names confirmed against the NEAR AI Cloud docs
// (docs.near.ai/cloud/guides/e2ee-chat-completions, github.com/nearai/nearai-cloud-verifier)
// on 2026-11-03. The signature/report payload shapes are stored as-is
// (raw, untyped) rather than re-typed field by field, since the docs don't
// commit to a fixed schema; re-check against a live response once
// NEAR_AI_API_KEY is available (see HACKATHON-NOTES.md).
export interface AttestationEvidence {
  model: string;
  chatId: string;
  report: unknown;
  signature: unknown;
  fetchedAt: string;
}

export async function fetchAttestationEvidence(opts: {
  apiKey: string;
  model: string;
  chatId: string;
  baseURL?: string;
}): Promise<AttestationEvidence> {
  const base = opts.baseURL ?? "https://cloud-api.near.ai/v1";
  const headers = { Authorization: `Bearer ${opts.apiKey}`, "x-no-aliasing": "true" };

  const reportUrl = new URL(`${base}/attestation/report`);
  reportUrl.searchParams.set("model", opts.model);
  reportUrl.searchParams.set("provider", "near");
  reportUrl.searchParams.set("nonce", cryptoRandomNonce());

  const [reportRes, signatureRes] = await Promise.all([
    fetch(reportUrl, { headers }),
    fetch(`${base}/signature/${opts.chatId}`, { headers }),
  ]);
  if (!reportRes.ok) throw new Error(`Attestation report fetch failed: HTTP ${reportRes.status}`);
  if (!signatureRes.ok) throw new Error(`Signature fetch failed: HTTP ${signatureRes.status}`);

  return {
    model: opts.model,
    chatId: opts.chatId,
    report: await reportRes.json(),
    signature: await signatureRes.json(),
    fetchedAt: new Date().toISOString(),
  };
}

function cryptoRandomNonce(): string {
  return createHash("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex").slice(0, 32);
}

function sha256Hex(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** attestation_hash = sha256(canonical JSON of {model, chat_id, signature, report_digest}) */
export function computeAttestationHash(evidence: AttestationEvidence): string {
  const reportDigest = sha256Hex(evidence.report);
  return sha256Hex({
    model: evidence.model,
    chat_id: evidence.chatId,
    signature: evidence.signature,
    report_digest: reportDigest,
  });
}
