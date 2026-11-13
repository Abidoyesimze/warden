# Deploy the backend to Railway

This runs the Warden backend (Express + SQLite) against the testnet contract, so the hosted frontend can do live uploads.

## 1. Create the service

1. Railway → **New Project → Deploy from GitHub repo** → `Abidoyesimze/warden`.
2. **Settings → Source → Root Directory:** leave it empty (the repo root). The backend imports the `agent/` workspace, so Railway must install from the root `package.json`.
3. **Settings → Build → Custom Build Command:** `npm ci`
4. **Settings → Deploy → Custom Start Command:** `npm run start -w backend`
5. **Settings → Networking → Generate Domain.** Railway sets `PORT` itself, and the backend reads it.

Node 20 or newer is required (root `package.json` `engines`).

## 2. Add a volume

The SQLite database and uploaded invoice files are written to `<repo root>/data`. Without a volume they are wiped on every redeploy.

- **New → Volume**, attach it to the service, mount path: `/app/data`

## 3. Variables

Set these in **Variables**. Copy the values from your local root `.env`. Never commit them.

| Variable | Value |
|---|---|
| `NEAR_NETWORK` | `testnet` |
| `NEAR_RPC_URL` | `https://rpc.testnet.fastnear.com` |
| `TREASURY_CONTRACT_ID` | `warden-treasury-cowry.testnet` |
| `AGENT_ACCOUNT_ID` | `warden-agent-cowry.testnet` |
| `AGENT_PRIVATE_KEY` | secret: from `.env` |
| `OWNER_ACCOUNT_ID` | `warden-owner-cowry.testnet` |
| `USDC_TOKEN_ID` | `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af` |
| `NEAR_AI_API_KEY` | secret: the funded key from `.env` |
| `NEAR_AI_MODEL` | `Qwen/Qwen3.6-35B-A3B-FP8` |
| `ONECLICK_BASE_URL` | same as `.env` |
| `ONECLICK_JWT` | same as `.env` |
| `WARDEN_FEE_BPS` | same as `.env` |
| `DB_PATH` | `./data/warden.sqlite` |

Do not set `PORT`; Railway provides it.

## 4. Check it

```bash
curl https://<your-app>.up.railway.app/vendors
```

It should return the three registered suppliers.

## 5. Point a live frontend at it

Create a second Vercel project from the same repo (Root Directory `frontend`) with:

```
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_API_URL=https://<your-app>.up.railway.app
NEXT_PUBLIC_CONTRACT_ID=warden-treasury-cowry.testnet
NEXT_PUBLIC_NEAR_NETWORK=testnet
```

Keep the demo-mode Vercel project as well; it works without any backend.

## Before you deploy

- **Agent key.** The testnet agent account still has a full-access key. On a public server, add a function-call key limited to `propose_payment`, `execute_payment` and `mark_settled` on the treasury, and use that as `AGENT_PRIVATE_KEY`.
- **Public uploads spend NEAR AI credits.** Anyone with the URL can upload invoices. The NEAR AI spend limit ($1) caps the cost.
- **Payments stop at 1Click.** NEAR Intents is mainnet-only, so approved invoices are recorded on-chain but not sent to suppliers on testnet.
