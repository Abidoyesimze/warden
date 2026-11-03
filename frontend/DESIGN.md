# Warden design system: "Precision Finance"

A serious financial instrument that happens to run on NEAR. Built for small-business owners who
are not crypto natives: plain language first, crypto details (hashes, chains) as secondary text.

Dark mode only. Desktop first, responsive down to mobile.

## Tokens

Defined as CSS variables in `app/globals.css` and mapped to Tailwind names in `tailwind.config.ts`.

| Token | Value | Tailwind | Use |
|---|---|---|---|
| `--bg` | `#0F1115` | `bg-bg` | App background, with a 32px grid at 1.8% white |
| `--surface-1` | `#15181D` | `bg-surface-1` | Cards, sidebar |
| `--surface-2` | `#1B1F26` | `bg-surface-2` | Hover, dialogs, inset panels |
| `--surface-3` | `#232833` | `bg-surface-3` | Active nav, skeletons, tooltips |
| `--border` | `#2A2F38` | `border-line` | 1px hairlines |
| `--border-strong` | `#363C47` | — | Dashed drop zone, neutral pill outline |
| `--text` | `#ECEDEF` | `text-fg` | Primary text |
| `--text-muted` | `#8B919C` | `text-muted` | Labels, secondary text |
| `--mint` | `#00E5A0` | `text-mint` | **Verified and Paid only** |
| `--amber` | `#F5B942` | `text-amber` | Under review / held |
| `--coral` | `#FF6B6B` | `text-coral` | Flagged, blocked, rejected, failed |
| `--radius-card` | 6px | `rounded-card` | Cards, dialogs |
| `--radius-input` | 4px | `rounded-input`, `rounded-pill` | Inputs, buttons, pills |

Not used on purpose: purple gradients, glassmorphism, neon, "brand blue". The primary button is off-white on charcoal.

### Typography

| Role | Font | Notes |
|---|---|---|
| Headings | Geist (`font-display`) | Semibold, tracking −0.02 to −0.03em |
| Body | Inter (`font-sans`) | 13–14px |
| Numbers, hashes, addresses, decision log | JetBrains Mono (`.num` or `font-mono`) | `.num` adds tabular lining figures and slashed zero |
| Labels | `.label` utility | 11px, uppercase, +0.06em, muted |

All fonts are bundled through npm (`geist`, `@fontsource-variable/*`), so builds need no font CDN.

### Contrast (WCAG 2.1)

Checked against every surface. All pairs pass AA for normal text (≥ 4.5:1).

| Text \ surface | bg | surface-1 | surface-2 | surface-3 |
|---|---|---|---|---|
| text | 16.1 | 15.2 | 14.1 | 12.6 |
| muted | 6.0 | 5.6 | 5.2 | 4.7 |
| mint | 11.4 | 10.8 | 10.0 | 8.9 |
| amber | 10.7 | 10.1 | 9.4 | 8.4 |
| coral | 6.8 | 6.4 | 6.0 | 5.3 |

Status pills sit on a 10% tint of their own colour: mint 9.0, amber 8.3, coral 5.7.

## Status system

`lib/status.ts` maps contract statuses to what the owner sees. Components never show raw statuses as the main label.

| Owner sees | Colour | Contract status |
|---|---|---|
| Paid | mint, with a check that draws once | `Settled` |
| Processing | off-white, 3-step indicator | `Approved` → `Sending` → `Sent` |
| Under review | amber | `Held` |
| Blocked | coral | `Rejected` with a BLOCK flag (e.g. duplicate invoice number) |
| Rejected | coral | `Rejected` by the owner |
| Failed | coral | `Failed` |
| Refunded | muted | `Refunded` |

Flags always have a plain-English label (`lib/flags.ts`), e.g. `DEST_MISMATCH` → "Payment address changed".
The raw code is shown next to it in small mono text for auditors.

## States

- **Loading:** skeletons shaped like the final layout and a 1px progress line at the top. No spinners in the middle of the page.
- **Upload:** four stages tick off in order (Uploading → Reading privately (TEE) → Checking 10 rules → Submitting to treasury).
  Extracted fields fade in as they arrive; rule results stream into the checklist.
- **Paid:** pill turns mint with a single short check animation; the on-chain receipt slides in. No confetti.
- **Held:** amber banner at the top of the invoice page with the main reason in one sentence.
- **Empty:** short, useful copy with a link to the next action. No illustrations.
- **Errors:** what failed and what to do next (`ApiError(message, action)`). Never a raw error dump.
- **Wallet signing:** the approve dialog shows payment ID, amount, supplier, destination asset/chain/address and the contract call
  before signing. If the invoice has fraud flags (not just a limit), the owner must tick "I confirmed this with the supplier" first.

## Motion

Framer Motion only for state changes: 150–250 ms, ease-out. `MotionConfig reducedMotion="user"` turns
transforms off for users who prefer reduced motion; CSS animations are disabled under the same media query.

## Icons

Lucide, 1.5px stroke, 16px in buttons and nav, 12–14px inline. The logo is a geometric shield with a mint check.

## Components

| Component | File |
|---|---|
| AppShell (sidebar, top bar with balance + wallet) | `components/app-shell.tsx` |
| StatusPill | `components/status-pill.tsx` |
| Amount | `components/amount.tsx` |
| Hash (shortened, copy, explorer link) | `components/hash.tsx` |
| LimitMeter | `components/limit-meter.tsx` |
| ActivityFeed | `components/activity-feed.tsx` |
| UploadDropzone | `components/upload-dropzone.tsx` |
| ExtractionProgress | `components/extraction-progress.tsx` |
| ExtractedFields | `components/extracted-fields.tsx` |
| InvoicePreview (reveals hidden text) | `components/invoice-preview.tsx` |
| RuleChecklist (R1–R10 + contract limits) | `components/rule-checklist.tsx` |
| RiskBanner | `components/risk-banner.tsx` |
| ReasoningSummary | `components/reasoning-summary.tsx` |
| AttestationBadge | `components/attestation-badge.tsx` |
| DecisionLog (terminal style) | `components/decision-log.tsx` |
| OnChainReceipt | `components/onchain-receipt.tsx` |
| ReviewCard | `components/review-card.tsx` |
| ApproveDialog, RejectDialog | `components/approve-dialog.tsx` |
| VerifyPanel | `components/verify-panel.tsx` |
| EmptyState, ErrorState | `components/empty-state.tsx` |
| Primitives (Button, Card, Dialog, Switch, Tooltip, Skeleton) | `components/ui/` (shadcn/ui pattern, restyled) |

## Data

`lib/api/index.ts` picks the data source:

- `NEXT_PUBLIC_DEMO_MODE=true` (default): in-memory store in `lib/api/demo.ts` with the 13 fixture invoices.
  Uploads, approvals and payments are simulated, so all three demo beats can be clicked through without keys.
- `NEXT_PUBLIC_DEMO_MODE=false`: HTTP client in `lib/api/http.ts` against the backend (see `docs/api.md`).
  Owner actions go through `lib/wallet.ts` (NEAR Wallet Selector, wired once the contract is deployed).
