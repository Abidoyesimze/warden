"use client";

import "@near-wallet-selector/modal-ui/styles.css";
import { createContext, useContext, useEffect, useState } from "react";
import { api, DEMO_MODE } from "@/lib/api";
import { connectWallet, createNearOwnerWallet, currentAccountId, disconnectWallet, loadSelector, takeReturnedApproval } from "@/lib/near-wallet";
import { setWallet } from "@/lib/wallet";

interface WalletState {
  /** Signed-in NEAR account, or null. In demo mode, a fake owner. */
  accountId: string | null;
  ready: boolean;
  connect: () => void;
  disconnect: () => void;
}

const DEMO_STATE: WalletState = { accountId: "adire-demo.near", ready: true, connect: () => {}, disconnect: () => {} };

const WalletContext = createContext<WalletState>(DEMO_STATE);

export function useOwnerWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [ready, setReady] = useState(DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) return;
    const owner = createNearOwnerWallet();
    setWallet(owner);

    // Back from a redirect wallet after approving: finish the payment.
    const approvedId = takeReturnedApproval();
    if (approvedId !== null) void api.finishApproval(approvedId).catch(() => undefined);

    let unsub: (() => void) | undefined;
    let alive = true;
    loadSelector()
      .then(({ selector }) => {
        if (!alive) return;
        const update = () => {
          const id = currentAccountId(selector);
          owner.accountId = id;
          setAccountId(id);
        };
        update();
        setReady(true);
        const sub = selector.store.observable.subscribe(update);
        unsub = () => sub.unsubscribe();
      })
      .catch(() => alive && setReady(true));
    return () => {
      alive = false;
      unsub?.();
    };
  }, []);

  if (DEMO_MODE) return <WalletContext.Provider value={DEMO_STATE}>{children}</WalletContext.Provider>;

  return (
    <WalletContext.Provider
      value={{
        accountId,
        ready,
        connect: () => void connectWallet(),
        disconnect: () => void disconnectWallet(),
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
