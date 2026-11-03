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
| Treasury contract | _tbd_ | not created |
| Agent (function-call key only) | _tbd_ | not created |
| Owner (business) | _tbd_ | not created |

## Phase log

- **Phase 0 (Nov 3):** monorepo, CI, IDs recorded. Accounts pending.
