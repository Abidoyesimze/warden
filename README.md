# Warden

**AI that pays real invoices. Nothing else.**

Warden is an AI finance agent for small businesses that pay overseas suppliers in stablecoins.
It reads each invoice privately on NEAR AI Cloud and checks it against ten fixed fraud rules.
A NEAR treasury contract enforces spending limits. Clean invoices are paid automatically through
NEAR Intents (1Click). Suspicious ones are held for a human. Every decision is logged on-chain.

> Work in progress for NEAR HACKATHON (Nov 2026). Full README lands in Phase 6.

## Layout

```
frontend/         Next.js dashboard
backend/          Express API, 1Click payments, contract calls, SQLite
agent/            Private invoice reading (NEAR AI Cloud TEE) + fraud rules R1–R10
smart-contract/   Rust treasury contract (caps, holds, approvals, event log)
fixtures/         Demo vendors, history and the 13 test invoices
scripts/          Deploy, seed, demo-reset, audit, verify-attestation
docs/             Architecture and threat model
```

## Develop

```bash
cp .env.example .env      # fill in keys; never commit .env
npm install
npm test                  # agent + backend unit tests
npm run test:contract     # Rust contract tests
```
