"use client";

import { MotionConfig } from "framer-motion";
import { WalletProvider } from "@/components/wallet-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  // Motion only for state changes, 150–250 ms ease-out, and off when the user prefers reduced motion.
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: "easeOut" }}>
      <WalletProvider>{children}</WalletProvider>
    </MotionConfig>
  );
}
