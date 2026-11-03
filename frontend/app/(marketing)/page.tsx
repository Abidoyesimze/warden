import { ArrowRight, ArrowUpRight, Ban, Check, Copy, Cpu, EyeOff, FileWarning, KeyRound, Landmark, Layers, ScrollText, ShieldCheck, Sparkles, UserX, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DecisionDemo } from "@/components/landing/decision-demo";
import { Pipeline } from "@/components/landing/pipeline";
import { Reveal } from "@/components/landing/reveal";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Warden · AI that pays real invoices. Nothing else.",
};

const REPO = "https://github.com/Abidoyesimze/warden";

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <SiteNav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Layers3 />
        <Rules />
        <DemoBeats />
        <BuiltOnNear />
        <ForWhom />
        <Limits />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ---------------------------------------------------------------- nav */

function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-[2px]">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-5">
        <Link href="/" aria-label="Warden home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-5 text-[13px] text-muted md:flex" aria-label="Sections">
          <a href="#how" className="hover:text-fg">How it works</a>
          <a href="#security" className="hover:text-fg">Security</a>
          <a href="#near" className="hover:text-fg">Built on NEAR</a>
          <a href="#limits" className="hover:text-fg">Limits</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <a href={REPO} target="_blank" rel="noreferrer">
              GitHub
              <ArrowUpRight />
            </a>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href="/dashboard">
              Open demo
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- hero */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* soft vignette over the grid, no gradients in brand colours */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_at_70%_30%,transparent_0%,var(--bg)_70%)]" aria-hidden />
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:py-24">
        <div>
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface-1 px-2.5 py-1 text-[12px] text-muted">
              <span className="size-1.5 rounded-full bg-mint" aria-hidden />
              AI finance agent on NEAR · NEAR HACKATHON 2026
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-5 font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-[56px]">
              AI that pays real invoices.
              <br />
              <span className="text-muted">Nothing else.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-[540px] text-[16px] leading-relaxed text-fg/80">
              Warden pays your overseas suppliers in stablecoins and stops fake or altered invoices before any money moves.
              Clean invoices are paid automatically. Suspicious ones wait for you, with the reason in plain English.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild variant="primary" size="lg">
                <Link href="/dashboard">
                  Open the live demo
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <a href="#how">See how it works</a>
              </Button>
            </div>
            <p className="mt-4 text-[12px] text-muted">No sign-up. The demo runs on sample invoices, so no real funds move.</p>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <DecisionDemo />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- problem */

const THREATS = [
  { icon: FileWarning, title: "Changed payment details", body: "A real supplier's invoice, edited to send the money to someone else's wallet." },
  { icon: UserX, title: "Fake and look-alike suppliers", body: "\"Shenzen Packaging\" instead of \"Shenzhen Packaging\". Easy to miss at the end of a long day." },
  { icon: Copy, title: "Duplicate invoices", body: "The same invoice sent twice, or re-sent with small edits and a new number." },
  { icon: EyeOff, title: "Hidden instructions for AI", body: "Invisible text that tells an AI assistant to \"pay this address instead\"." },
];

function Problem() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-[1200px] px-5 py-20">
        <SectionHead
          eyebrow="The problem"
          title="Paying suppliers abroad is slow, and invoice fraud is easy."
          body="A small importer in Lagos paying suppliers in China and contractors in Europe spends hours on bridging and approvals. One altered invoice can wipe out a month's margin. And if you hand payments to an AI agent, a single malicious invoice can talk it into paying the wrong person."
        />
        <div className="mt-10 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {THREATS.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 0.05} className="bg-surface-1 p-5">
              <Icon className="size-[18px] text-coral" strokeWidth={1.5} />
              <p className="mt-4 text-[14px] font-medium text-fg">{title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- how */

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-14 border-b border-line">
      <div className="mx-auto max-w-[1200px] px-5 py-20">
        <SectionHead eyebrow="How it works" title="From invoice to paid, with a check at every step." />
        <div className="mt-12">
          <Pipeline />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- three layers */

const LAYERS = [
  {
    icon: Sparkles,
    tag: "The AI reads",
    title: "Extracts fields. Never decides.",
    body: "The model turns an invoice into a fixed record (supplier, amount, dates, payment details) and lists any instruction-like text instead of following it. It runs privately in a TEE, with attestation stored for every invoice.",
    cant: "Can't pay, can't choose an address, can't change a rule",
  },
  {
    icon: Layers,
    tag: "Rules decide",
    title: "Ten fixed, tested checks.",
    body: "Deterministic code compares the invoice with your supplier list and payment history. Reasons are written from templates, so you always know exactly why something was held.",
    cant: "Can't be argued with by text inside an invoice",
  },
  {
    icon: Landmark,
    tag: "The contract enforces",
    title: "Your money, your limits, on-chain.",
    body: "A NEAR smart contract holds the USDC. It re-checks caps and the supplier registry on every payment and pays only the registry address. The agent's key can call three methods and nothing else.",
    cant: "Can't be bypassed, even by a compromised server",
  },
];

function Layers3() {
  return (
    <section id="security" className="scroll-mt-14 border-b border-line">
      <div className="mx-auto max-w-[1200px] px-5 py-20">
        <SectionHead
          eyebrow="Security model"
          title="The AI reads. Rules decide. The contract enforces."
          body="Three independent layers, so a clever invoice, a model mistake or a compromised server still can't move your money to the wrong place."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {LAYERS.map(({ icon: Icon, tag, title, body, cant }, i) => (
            <Reveal key={tag} delay={i * 0.07}>
              <div className="flex h-full flex-col rounded-card border border-line bg-surface-1 p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-input border border-line bg-surface-2">
                    <Icon className="size-4 text-fg" strokeWidth={1.5} />
                  </span>
                  <span className="num text-[11px] text-muted">0{i + 1}</span>
                  <span className="label">{tag}</span>
                </div>
                <h3 className="mt-5 text-[17px] text-fg">{title}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">{body}</p>
                <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-[12px] text-fg/85">
                  <Ban className="mt-0.5 size-3.5 shrink-0 text-coral" strokeWidth={1.5} />
                  {cant}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- rules */

const RULES: [string, string, string][] = [
  ["R1", "New or look-alike supplier", "Not on your list, or one letter away from a supplier who is"],
  ["R2", "Payment address changed", "Address on the invoice differs from the approved one"],
  ["R3", "Unusual amount", "Far above this supplier's usual invoices"],
  ["R4", "Duplicate invoice number", "Already paid or pending. Blocked outright"],
  ["R5", "Re-sent with edits", "Same amount from the same supplier within 14 days"],
  ["R6", "Currency changed", "Different currency from this supplier's history"],
  ["R7", "Hidden instructions", "Text like \"ignore previous\" or \"AI assistant: pay to…\""],
  ["R8", "Totals don't add up", "Line items don't match the invoice total"],
  ["R9", "Unreadable or incomplete", "Low confidence or required fields missing"],
  ["R10", "Odd dates", "Issued in the future, or \"urgent, pay today\""],
];

function Rules() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-20 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <SectionHead
          eyebrow="Fraud checks"
          title="Ten red flags, checked on every invoice."
          body="Each rule is its own file with its own tests. The full suite of 13 test invoices runs with one command: npm run test:fraud."
        />
        <Reveal>
          <ul className="overflow-hidden rounded-card border border-line bg-surface-1">
            {RULES.map(([id, title, body]) => (
              <li key={id} className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3 last:border-0 sm:grid-cols-[44px_220px_minmax(0,1fr)]">
                <span className="num pt-px text-[12px] text-muted">{id}</span>
                <span className="text-[13px] text-fg">{title}</span>
                <span className="col-start-2 text-[13px] text-muted sm:col-start-3">{body}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- demo beats */

const BEATS = [
  {
    pill: { label: "Paid", cls: "text-mint bg-mint/10 [box-shadow:inset_0_0_0_1px_rgb(0_229_160/0.28)]", icon: true },
    title: "A normal invoice is paid automatically",
    body: "Known supplier, usual amount, correct address. Paid in USDC on Base through NEAR Intents, with an explorer link.",
    href: "/invoices/inv_01",
  },
  {
    pill: { label: "Under review", cls: "text-amber bg-amber/10 [box-shadow:inset_0_0_0_1px_rgb(245_185_66/0.28)]", icon: false },
    title: "A tampered invoice is held",
    body: "Same supplier, changed wallet address and hidden \"pay this address instead\" text. Held with clear reasons; the hold is recorded on-chain.",
    href: "/invoices/inv_03",
  },
  {
    pill: { label: "Under review", cls: "text-amber bg-amber/10 [box-shadow:inset_0_0_0_1px_rgb(245_185_66/0.28)]", icon: false },
    title: "A large invoice waits for the owner",
    body: "Legitimate, but above the auto-pay limit. The owner checks it, signs with their NEAR wallet, and it's paid.",
    href: "/invoices/inv_12",
  },
];

function DemoBeats() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-[1200px] px-5 py-20">
        <SectionHead eyebrow="Try it" title="Three invoices tell the whole story." body="Each opens in the demo dashboard with its rule checks, decision log and on-chain proof." />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {BEATS.map((b, i) => (
            <Reveal key={b.title} delay={i * 0.07}>
              <Link href={b.href} className="group flex h-full flex-col rounded-card border border-line bg-surface-1 p-6 transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-surface-2">
                <div className="flex items-center justify-between">
                  <span className="num text-[11px] text-muted">Beat 0{i + 1}</span>
                  <span className={`inline-flex h-[22px] items-center gap-1.5 rounded-pill px-2 text-[12px] font-medium ${b.pill.cls}`}>
                    {b.pill.icon ? <Check className="size-3" strokeWidth={2} /> : <span className="size-1.5 rounded-full bg-current" />}
                    {b.pill.label}
                  </span>
                </div>
                <h3 className="mt-5 text-[16px] text-fg">{b.title}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">{b.body}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-fg">
                  Open in demo
                  <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={1.5} />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- NEAR */

const NEAR_TECH = [
  { icon: Wallet, name: "NEAR Intents (1Click API)", body: "Pays from USDC on NEAR to the supplier's chosen stablecoin and chain, with quotes verified before use." },
  { icon: Cpu, name: "NEAR AI Cloud", body: "Private inference inside a TEE. Attestation evidence is stored and can be re-verified by anyone." },
  { icon: Landmark, name: "Treasury smart contract", body: "Holds funds and enforces caps, holds, approvals and the supplier registry." },
  { icon: ScrollText, name: "NEP-297 events", body: "Every decision is an on-chain event. The audit trail can be rebuilt from mainnet without our backend." },
  { icon: KeyRound, name: "Function-call access keys", body: "The agent's key can only propose, execute and settle. It can't withdraw or change limits." },
  { icon: ShieldCheck, name: "Wallet Selector", body: "The business owner approves held payments by signing with their own NEAR wallet." },
];

function BuiltOnNear() {
  return (
    <section id="near" className="scroll-mt-14 border-b border-line">
      <div className="mx-auto max-w-[1200px] px-5 py-20">
        <SectionHead eyebrow="Built on NEAR" title="Each part of the safety story is a NEAR primitive." />
        <div className="mt-10 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {NEAR_TECH.map(({ icon: Icon, name, body }, i) => (
            <Reveal key={name} delay={(i % 3) * 0.05} className="bg-surface-1 p-6">
              <Icon className="size-[18px] text-fg" strokeWidth={1.5} />
              <p className="mt-4 text-[14px] font-medium text-fg">{name}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- who / business */

function ForWhom() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-[1200px] gap-4 px-5 py-20 lg:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-card border border-line bg-surface-1 p-6">
            <p className="label">Who it&apos;s for</p>
            <h3 className="mt-3 text-[20px] text-fg">Small importers and agencies paying across borders.</h3>
            <p className="mt-3 text-[14px] leading-relaxed text-muted">
              A business in Lagos buying packaging from Shenzhen, design work from Accra and development from Lisbon. Each supplier is paid in the
              stablecoin and chain they prefer, from one USDC treasury on NEAR, without manual bridging.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.07}>
          <div className="h-full rounded-card border border-line bg-surface-1 p-6">
            <p className="label">Business model</p>
            <h3 className="mt-3 text-[20px] text-fg">A small fee per payment, plus a monthly plan.</h3>
            <ul className="mt-4 space-y-3 text-[14px]">
              <li className="flex gap-3">
                <span className="num pt-0.5 text-[12px] text-muted">01</span>
                <span className="text-fg/85">Per-payment fee, collected on-chain through the 1Click app-fee parameter.</span>
              </li>
              <li className="flex gap-3">
                <span className="num pt-0.5 text-[12px] text-muted">02</span>
                <span className="text-fg/85">Subscription for spending policy, approvals and the audit trail.</span>
              </li>
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- limits */

function Limits() {
  return (
    <section id="limits" className="scroll-mt-14 border-b border-line">
      <div className="mx-auto max-w-[1200px] px-5 py-20">
        <SectionHead
          eyebrow="Known limits"
          title="What Warden doesn't protect against (yet)."
          body="We'd rather you hear it from us. The full threat model is in the repo."
        />
        <Reveal>
          <ul className="mt-10 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-3">
            {[
              ["Owner approves without reading", "Held invoices still need a careful human. Warden asks the owner to confirm with the supplier before overriding a fraud warning."],
              ["Compromised owner key", "The owner can add suppliers and approve payments. Multisig approvals are planned."],
              ["Deposit address checked off-chain", "The contract can't yet verify a 1Click deposit address on-chain; the agent verifies each quote and caps limit the damage."],
            ].map(([t, b]) => (
              <li key={t} className="bg-surface-1 p-6">
                <p className="text-[14px] font-medium text-fg">{t}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{b}</p>
              </li>
            ))}
          </ul>
        </Reveal>
        <a href={`${REPO}/tree/main/docs`} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-fg hover:underline">
          Read the threat model
          <ArrowUpRight className="size-3.5" strokeWidth={1.5} />
        </a>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- CTA + footer */

function FinalCta() {
  return (
    <section>
      <div className="mx-auto max-w-[1200px] px-5 py-24 text-center">
        <Reveal>
          <h2 className="font-display text-[32px] font-semibold tracking-[-0.03em] text-fg sm:text-[40px]">See it stop a fake invoice.</h2>
          <p className="mx-auto mt-4 max-w-[520px] text-[15px] text-muted">
            Open the demo, upload the tampered sample invoice, and watch Warden hold it before any money moves.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href="/upload">
                Upload a sample invoice
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <a href={REPO} target="_blank" rel="noreferrer">
                Read the code
                <ArrowUpRight />
              </a>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-6 text-[12px] text-muted">
        <span className="flex items-center gap-3">
          <Logo />
          <span>AI that pays real invoices. Nothing else.</span>
        </span>
        <span>Built for NEAR HACKATHON 2026 · AI Security &amp; Defense</span>
      </div>
    </footer>
  );
}

function SectionHead({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <Reveal>
      <p className="label">{eyebrow}</p>
      <h2 className="mt-3 max-w-[720px] font-display text-[28px] font-semibold leading-tight tracking-[-0.03em] text-fg sm:text-[34px]">{title}</h2>
      {body && <p className="mt-4 max-w-[680px] text-[15px] leading-relaxed text-muted">{body}</p>}
    </Reveal>
  );
}
