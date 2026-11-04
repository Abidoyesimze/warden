# Hackathon notes

- **Event:** NEAR HACKATHON, Nov 1–14, 2026
- **Track:** AI Security & Defense (also fits Real-World Money and Autonomous Business)
- **Team:** Cowry

## Repo layout

| Folder | What it is | Can it move money? |
|---|---|---|
| `frontend/` | Next.js dashboard for the business owner | No. The owner signs in their own wallet |
| `backend/` | Express API. Stores invoices, calls the agent, talks to the contract and 1Click | Only what the contract allows, via a function-call key |
| `agent/` | AI invoice reading (NEAR AI Cloud TEE) + fraud rules R1–R10 | No. No keys, no network access to the chain |
| `smart-contract/` | Rust treasury on NEAR mainnet. Holds USDC, enforces caps, logs every decision | Yes, the only thing that can |

## Chosen IDs (fetched live on 2026-11-03)

### 1Click `GET /v0/tokens`

| Use | Asset ID | Decimals |
|---|---|---|
| Treasury holds: USDC on NEAR | `nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1` | 6 |
| Destination 1: USDC on Base | `nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near` | 6 |
| Destination 2: USDT on Solana | `nep141:sol-c800a4bd850783ccb82c2b2c7e84175443606352.omft.near` | 6 |

USDC contract on NEAR (`USDC_TOKEN_ID`): `17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1`.

Destination 2 is provisional: USDT on Solana keeps fees low. USDT on Tron
(`nep141:tron-d28a265909efecdcee7c5028585214ea0b96f015.omft.near`) is the
alternative if the team has a Tron wallet.

### NEAR AI Cloud `GET /v1/model/list`

- **Chosen:** `Qwen/Qwen3.6-35B-A3B-FP8`. Hosted by NEAR (vllm), `verifiable: true`,
  `attestationSupported: true`, supports `json_mode` and `structured_outputs`, 262k context.
- **Fallback:** `z-ai/glm-5.3-flash`. Same properties.
- **Rejected:** all `anthropic/*`, `openai/*`, `google/*` models. They are
  `providerType: external` with `attestationSupported: false`, so they don't run in a TEE we can prove.

## NEAR accounts (mainnet)

| Role | Account | Status |
|---|---|---|
| Treasury contract | `warden.carlos21.near` | created 2026-11-04, funded 0.05 NEAR, no contract deployed yet |
| Agent (function-call key only) | `warden-agent.carlos21.near` | created 2026-11-04, funded 0.05 NEAR, still holds a **full-access** key — needs to be replaced with a function-call-only key scoped to `propose_payment`/`execute_payment`/`mark_settled` before going live (see "Open question" below) |
| Owner (business) | `carlos21.near` | existing account, ~0.13 NEAR remaining after funding the two above |

Keys for all three are in this machine's local `near-cli-rs` keychain (macOS Keychain), not committed anywhere.

**Funding needed before deploy:** after optimizing the build (see "Contract size" below), the compiled contract is 218KB, so deploying to `warden.carlos21.near` needs roughly **2.2 NEAR** in that account specifically (storage is charged against the account the code lives on), on top of the ~0.23 NEAR currently spread across the three accounts. Get **~2.5-3 NEAR** total to leave a buffer for setup calls, plus (separately, not blocking) ~$15 in USDC later to actually fund demo payments. Not yet funded as of 2026-11-04 — mainnet deploy is blocked on this.

### Contract size (mainnet deploy cost)

Storage on NEAR costs ~0.00001 NEAR/byte, so wasm size directly sets deploy cost:

| Build | Size | Deploy cost |
|---|---|---|
| Plain `cargo build --release` (what Phase 2 initially used — wrong tool) | 424 KB | ~4.25 NEAR |
| `cargo-near build` (proper pipeline: runs `wasm-opt` post-step) | 233 KB | ~2.33 NEAR |
| + hand-rolled JSON event logs instead of `serde_json::json!` (dropped `serde_json` dep entirely) | **218 KB** | **~2.18 NEAR** |

Always build with `cargo near build non-reproducible-wasm` (or `cargo near deploy ...`), never plain `cargo build`, when size/deploy cost matters — confirmed via `cargo tree`/feature inspection that near-sdk's default features (`wee_alloc` only) are already minimal and the embedded ABI only costs ~1.7KB, so 218KB is close to the floor for this contract's actual logic without cutting something real (did **not** disable `overflow-checks = true` to save size — that's load-bearing for a contract that moves money).

### Testnet deployment (live-verified, 2026-11-04)

Deployed and smoke-tested end to end on testnet while waiting on mainnet funding — this is **not** a substitute for the mainnet deploy (NEAR Intents/1Click has no testnet, so the actual payment-execution leg can never be tested here), but it proves the contract's core decision logic works on a real live network, not just in unit tests.

| Role | Testnet account |
|---|---|
| Treasury | `warden-treasury-cowry.testnet` |
| Agent | `warden-agent-cowry.testnet` |
| Owner | `warden-owner-cowry.testnet` |

Verified live: deploy + `new` init, `upsert_vendor` (event log confirmed correct `EVENT_JSON:...` shape), `propose_payment` auto-approving a normal amount (`status: "Approved"`), and `propose_payment` holding an over-limit amount (`status: "Held"`, `flags: ["OVER_AUTO_PAY_LIMIT"]`). `usdc_token` is set to a placeholder (`usdc-mock.testnet`, not a real deployed token) since testnet has no real USDC — `execute_payment`'s actual `ft_transfer` leg is untested here and will be first exercised for real on mainnet.

## Phase log

- **Phase 0 (Nov 3):** monorepo, CI, IDs recorded. Accounts pending.
- **Phase 2 code (Nov 3):** treasury contract complete (`smart-contract/src/lib.rs`,
  `types.rs`, `events.rs`). `cargo test` is 15/15, zero warnings. Builds clean to
  `wasm32-unknown-unknown` release (424KB). **Not yet deployed** — needs the 3 mainnet
  accounts (treasury/agent/owner), funding, and `cargo-near`/`near` CLI, none of which
  exist on this machine yet. near-workspaces sandbox integration tests (real cross-contract
  ft_transfer against a mock token) are not written — the promise chain in `execute_payment`
  is unit-tested up to the point it schedules the cross-contract calls, and the callback's
  bookkeeping (`finalize_execute`) is tested directly with a mocked success/failure bool,
  since near-sdk's unit-test harness can't resolve real promise results without a sandbox.
- **Phase 1 (payment spike) and the real mainnet deploy are blocked on:** 3 NEAR mainnet
  accounts + funding, `NEAR_AI_API_KEY`, `ONECLICK_JWT`. Contract code also uses a
  placeholder `storage_deposit` amount (10 mNEAR) in `execute_payment` pending the live
  $1 spike that's supposed to confirm the real cost and deposit-address format.
- **Phase 3 + 4 code (Nov 3):** full pipeline built and tested end to end with fakes
  standing in for the three things that need real credentials (NEAR AI Cloud, NEAR
  mainnet, 1Click). Nothing below talks to a real account or spends real money yet.
  - `agent/`: zod schema, prompt, NEAR AI Cloud client (`extract/client.ts`), attestation
    fetch + hash (`extract/attestation.ts`, endpoints confirmed against docs.near.ai on
    2026-11-03), PDF/txt reader (`extract/read-file.ts`), and the full risk engine R1–R10
    (`risk/`). `npm run test:fraud` is **13/13**, deterministic (fixed reference clock, see
    `test/fraud.test.ts`), runs with no API key.
  - `fixtures/`: `vendors.json` (3 demo vendors — addresses are placeholders, **not** real
    team-controlled wallets yet), `history/*.json` (10/8/6 past invoices), `invoices/*.extracted.json`
    (hand-authored ground truth for all 13 scenarios) + `expected.json`. `scripts/make-fixtures.ts`
    (PDF generation via pdfkit) was **not** built — test:fraud doesn't need the raw files, only
    test:fraud:live and the real upload UI do; raw `.txt`/`.pdf` fixtures are a fast-follow.
  - `backend/`: SQLite schema (`db/`), NEAR chain client wrapping near-api-js v7's
    `Account`/`JsonRpcProvider` (`chain/client.ts` — tx hashes captured via `callFunctionRaw`,
    not just `callFunction`, so events carry real hashes), 1Click client (`pay/oneclick.ts`,
    fields confirmed against docs.near-intents.org on 2026-11-03), the full `POST /invoices`
    pipeline (`pipeline.ts`), and every route from `docs/api.md` (`app.ts`). 11/11 backend
    tests pass against a fake chain + fake extraction/attestation/1Click — the fakes mimic
    the contract's decision logic loosely (the real logic is already covered by the
    contract's own 15 tests); what these tests actually prove is that the wiring between
    extraction → risk engine → chain calls → SQLite → API responses is correct.
  - `scripts/audit.ts` and `scripts/verify-attestation.ts` are written but **unverified
    against a live contract/DB** (nothing to point them at yet). `verify-attestation.ts`
    only checks evidence integrity (hash matches what was stored), not full TEE attestation
    against Intel's root of trust — that needs the official `nearai-cloud-verifier` tooling,
    cut per the "if behind schedule" list below.
  - Known simplification: `POST /payments/:id/execute` awaits the full 1Click settlement
    (quote → execute → poll → markSettled) synchronously in one HTTP request instead of a
    background job queue. Fine at this project's $1–3 scale (settles in seconds); would need
    revisiting for larger volumes.
- **Everything above is `cargo test` / `npm test` / `npm run test:fraud` green at the repo
  root right now** — typecheck and lint are clean on all four workspaces (agent, backend,
  frontend, contract). What's genuinely not done, and can't be done without the user: the
  3 NEAR mainnet accounts, `NEAR_AI_API_KEY`, `ONECLICK_JWT`, real team-controlled demo
  wallets, the Phase 1 manual $1 spike, and the actual mainnet deploy + funding.
