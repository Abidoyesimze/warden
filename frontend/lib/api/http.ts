// Live client: talks to the Warden backend (see docs/api.md).
// Owner actions are signed in the browser wallet first; the backend never holds the owner's key.

import { ApiError, type WardenApi } from "./client";
import type { InvoiceDetail, PaymentSummary, Treasury, UploadEvent, VerifyResponse, VerifyResult } from "./types";
import { getWallet } from "../wallet";

const POLL_MS = 5000;

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { ...init, headers: { Accept: "application/json", ...init?.headers } });
  } catch {
    throw new ApiError("Can't reach the Warden backend.", "Check that the backend is running, then retry.");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string; action?: string } | null;
    throw new ApiError(body?.message ?? `Request failed (${res.status}).`, body?.action);
  }
  return (await res.json()) as T;
}

/** Turns the backend's flat verify response into the stored/on-chain pairs the panel shows. */
export function toVerifyResult(r: VerifyResponse): VerifyResult {
  return {
    invoiceHash: { stored: r.recomputedInvoiceHash, onChain: r.onChainInvoiceHash, match: r.invoiceHashMatches },
    attestationHash: { stored: r.recomputedAttestationHash, onChain: r.onChainAttestationHash, match: r.attestationHashMatches },
  };
}

/** The backend sends file links relative to itself; point them at the proxy. */
export function withFileBase(invoice: InvoiceDetail, base: string): InvoiceDetail {
  const url = invoice.fileUrl;
  return url && url.startsWith("/") ? { ...invoice, fileUrl: `${base}${url}` } : invoice;
}

export function createHttpApi(base: string): WardenApi {
  const json = { "Content-Type": "application/json" };
  const execute = (paymentId: number) =>
    request(base, `/payments/${paymentId}/execute`, { method: "POST", headers: json, body: "{}" }).then(() => undefined);
  return {
    mode: "live",
    getTreasury: () => request<Treasury>(base, "/treasury"),
    listPayments: () => request<PaymentSummary[]>(base, "/payments"),
    listReview: () => request<PaymentSummary[]>(base, "/payments/review"),
    getInvoice: async (id) => withFileBase(await request<InvoiceDetail>(base, `/invoices/${encodeURIComponent(id)}`), base),

    async uploadInvoice(file: File, onEvent: (e: UploadEvent) => void) {
      onEvent({ stage: "uploading" });
      const form = new FormData();
      form.append("file", file);
      let res: Response;
      try {
        res = await fetch(`${base}/invoices`, { method: "POST", body: form });
      } catch {
        throw new ApiError("Upload failed: can't reach the Warden backend.", "Check your connection and retry.");
      }
      if (!res.ok || !res.body) throw new ApiError(`Upload failed (${res.status}).`, "Retry the upload.");

      // The backend streams newline-delimited JSON progress events.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let invoiceId: string | null = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line) as UploadEvent;
          if (ev.stage === "error") throw new ApiError(ev.message);
          if (ev.stage === "done" && ev.invoiceId) invoiceId = ev.invoiceId;
          onEvent(ev);
        }
      }
      if (!invoiceId) throw new ApiError("The backend stopped before finishing.", "Check the invoice list; if it's missing, upload again.");
      return invoiceId;
    },

    async approve(paymentId) {
      await getWallet().signApprove(paymentId);
      await execute(paymentId);
    },

    finishApproval: execute,

    async reject(paymentId, _invoice, reason) {
      await getWallet().signReject(paymentId, reason);
    },

    verify: async (id) => toVerifyResult(await request<VerifyResponse>(base, `/invoices/${encodeURIComponent(id)}/verify`, { method: "POST" })),

    async setPaused(paused) {
      await getWallet().signSetPaused(paused);
    },

    async setLimits(limits) {
      await getWallet().signSetLimits(limits);
    },

    subscribe(listener) {
      const t = setInterval(listener, POLL_MS);
      return () => clearInterval(t);
    },
  };
}
