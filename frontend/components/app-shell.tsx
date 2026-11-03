"use client";

import { FileUp, Inbox, LayoutGrid, Menu, Settings, ShieldCheck, Wallet, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Amount } from "@/components/amount";
import { Logo } from "@/components/logo";
import { TooltipProvider } from "@/components/ui/tooltip";
import { api, DEMO_MODE, useQuery } from "@/lib/api";
import { DEMO_BUSINESS } from "@/lib/api/demo-data";
import { cn, nearAccountUrl } from "@/lib/format";
import { getWallet } from "@/lib/wallet";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/upload", label: "Upload invoice", icon: FileUp },
  { href: "/review", label: "Review queue", icon: Inbox, badge: true },
  { href: "/treasury", label: "Treasury & limits", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const treasury = useQuery("treasury", () => api.getTreasury());
  const review = useQuery("review", () => api.listReview());
  const reviewCount = review.data?.length ?? 0;

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const nav = (
    <nav className="flex flex-col gap-0.5 px-2" aria-label="Main">
      {NAV.map(({ href, label, icon: Icon, badge }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex h-8 items-center gap-2.5 rounded-input px-2.5 text-[13px] transition-colors duration-150",
            isActive(href) ? "bg-surface-3 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <Icon className="size-4" strokeWidth={1.5} />
          <span className="flex-1">{label}</span>
          {badge && reviewCount > 0 && (
            <span className="num rounded-[3px] bg-amber/15 px-1.5 text-[11px] text-amber">{reviewCount}</span>
          )}
        </Link>
      ))}
    </nav>
  );

  const contractId = treasury.data?.contractId;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Link href="/" aria-label="Warden home">
          <Logo />
        </Link>
      </div>
      <div className="px-4 pb-3">
        <p className="label">Business</p>
        <p className="mt-0.5 truncate text-[13px] text-fg">{DEMO_MODE ? DEMO_BUSINESS : "Your business"}</p>
      </div>
      {nav}
      <div className="mt-auto space-y-2 border-t border-line px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="label">Network</span>
          <span className="num text-[11px] text-muted">{process.env.NEXT_PUBLIC_NEAR_NETWORK ?? "mainnet"}</span>
        </div>
        {contractId && (
          <div className="flex items-center justify-between gap-2">
            <span className="label">Treasury</span>
            <a href={nearAccountUrl(contractId)} target="_blank" rel="noreferrer" className="num truncate text-[11px] text-muted hover:text-fg">
              {contractId}
            </a>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 border-r border-line bg-surface-1/80 lg:block">{sidebar}</aside>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-[260px] border-r border-line bg-surface-1">
              <button className="absolute right-3 top-4 rounded-input p-1 text-muted hover:text-fg" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="size-4" strokeWidth={1.5} />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-[2px] lg:px-6">
            <button className="rounded-input p-1.5 text-muted hover:bg-surface-2 hover:text-fg lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="size-4" strokeWidth={1.5} />
            </button>
            <span className="lg:hidden">
              <Logo />
            </span>
            {DEMO_MODE && (
              <span className="hidden rounded-pill border border-dashed border-[var(--border-strong)] px-2 py-0.5 text-[11px] text-muted sm:inline">
                Demo data · no real funds
              </span>
            )}
            {treasury.data?.paused && (
              <span className="rounded-pill bg-coral/10 px-2 py-0.5 text-[11px] font-medium text-coral">Payments paused</span>
            )}
            <div className="ml-auto flex items-center gap-4">
              <div className="hidden items-baseline gap-2 sm:flex">
                <span className="label">Treasury</span>
                {treasury.data ? <Amount value={treasury.data.balance} /> : <span className="skeleton inline-block h-3 w-16" />}
              </div>
              <WalletButton />
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 lg:px-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}

function WalletButton() {
  const account = DEMO_MODE ? "adire-demo.near" : getWallet().accountId;
  return (
    <Link
      href="/settings"
      className="inline-flex h-8 items-center gap-2 rounded-input px-2.5 text-[12px] hairline hover:bg-surface-2"
      title={account ? `Signed in as ${account}` : "Connect your NEAR wallet"}
    >
      <Wallet className="size-3.5 text-muted" strokeWidth={1.5} />
      {account ? (
        <>
          <span className="size-1.5 rounded-full bg-mint" aria-hidden />
          <span className="num max-w-[140px] truncate text-fg">{account}</span>
        </>
      ) : (
        <span className="text-fg">Connect wallet</span>
      )}
    </Link>
  );
}
