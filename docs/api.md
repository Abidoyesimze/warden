# Backend API (frontend ⇄ backend contract)

The frontend is built against these shapes. **Tell the frontend owner before changing any route or field.**
TypeScript source of truth: `frontend/lib/api/types.ts`.

- Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`)
- Amounts: decimal strings in USDC, e.g. `"1.20"` (never floats, never yocto/micro units)
- Times: ISO 8601 UTC strings
- Statuses: contract names `Approved | Sending | Sent | Settled | Held | Rejected | Failed | Refunded`
- Errors: non-2xx with `{ "message": "What failed", "action": "What to do next" }` (both plain English)
- CORS: allow `http://localhost:3000` and the Vercel URL

## Routes

| Method | Path | Returns |
|---|---|---|
| GET | `/treasury` | `Treasury`: contractId, ownerId, agentId, balance, limits `{ autoPayLimit, perTxCap, dailyCap, spentToday }`, paused, vendors[] |
| GET | `/payments` | `PaymentSummary[]`, newest first |
| GET | `/payments/review` | `PaymentSummary[]` with status `Held`, most urgent first |
| GET | `/invoices/:id` | `InvoiceDetail` (see below) |
| GET | `/invoices/:id/file` | The original uploaded file (PDF/txt), used for the preview |
| POST | `/invoices` | multipart `file`. Streams progress as newline-delimited JSON (see below) |
| POST | `/payments/:id/execute` | Called after the owner signs `approve_payment` in their wallet. Gets a fresh 1Click quote and executes |
| POST | `/invoices/:id/verify` | `VerifyResult`: recomputed invoice + attestation hashes vs. on-chain values |

### `PaymentSummary`

```ts
{ id: number, invoiceId: string, invoiceNumber: string, vendorId: string | null, vendorName: string,
  amount: string, status: ContractStatus, flags: string[], topFlag: string | null, createdAt: string, updatedAt: string }
```

`flags` contains the rule flags (`DEST_MISMATCH`, …; BLOCK-severity ones prefixed `BLOCK:`) plus contract-side ones:
`OVER_AUTO_PAY_LIMIT`, `OVER_VENDOR_MAX`, `OVER_DAILY_CAP`, `OVER_HARD_CAP`, `DUPLICATE_HASH`. `topFlag` is the most important one, without the `BLOCK:` prefix.

### `InvoiceDetail`

```ts
{
  id, fileName, fileType: "pdf" | "txt", fileUrl: string | null, previewText, invoiceHash,
  payment: PaymentSummary,
  extracted: ExtractedInvoice,               // exactly the agent's zod schema
  decision: "PAY" | "HOLD" | "BLOCK",        // rules engine decision
  rules: { id: "R1".."R10", passed, flag, severity, reason }[],   // all 10, in order
  policy: { id: "REGISTRY" | "AUTO_PAY_LIMIT" | "VENDOR_MAX" | "PER_TX_CAP" | "DAILY_CAP", passed, reason }[],
  summary: string,                           // plain English, generated from rule results
  attestation: { model, chatId, hash, signingAddress, verified, checkedAt },
  events: { name, at, txHash, actor, detail? }[],   // NEP-297 events for this payment, oldest first
  receipt: { nearTxHash, destChain, destAsset, destTxHash, amountOut, recipient, settledAt, intentsRef } | null,
  vendor: Vendor | null                      // registry entry
}
```

`reason` strings are shown to the owner as-is. Write them from templates, e.g.
`"Invoice asks for payment to 0xAb37…7A9F, but Shenzhen Packaging Co.'s approved address is 0x5C1f…03C7."`

### `POST /invoices` progress stream

`Content-Type: application/x-ndjson`, one JSON object per line:

```
{"stage":"uploading"}
{"stage":"reading"}
{"stage":"reading","extracted":{"vendor_name":"…","invoice_number":"…"}}
{"stage":"checking","extracted":{…full record…}}
{"stage":"checking","rules":[…results so far…]}
{"stage":"submitting","decision":"HOLD"}
{"stage":"done","invoiceId":"inv_…","status":"Held","decision":"HOLD"}
```

On failure send `{"stage":"error","message":"Payment quote expired. Retry to get a fresh quote."}` and close.

## Owner actions (signed in the browser, not by the backend)

The frontend calls these on the treasury contract with NEAR Wallet Selector:
`approve_payment({ id })`, `reject_payment({ id, reason })`, `set_limits({ … })`, `pause()`, `unpause()`.
Please share the final method names and argument shapes once the contract is deployed.
