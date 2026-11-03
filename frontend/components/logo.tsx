/** Warden mark: a shield reduced to two strokes and a check notch. Geometric, single colour. */
export function LogoMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 2.5 4 5.5v6.2c0 4.6 3.3 8.4 8 9.8 4.7-1.4 8-5.2 8-9.8V5.5l-8-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m8.5 12 2.5 2.5 4.5-5" stroke="var(--mint)" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-fg">
      <LogoMark />
      <span className="font-display text-[15px] font-semibold tracking-[-0.03em]">Warden</span>
    </span>
  );
}
