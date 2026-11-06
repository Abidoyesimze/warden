"use client";

// Owner wallet for live mode, via NEAR Wallet Selector.
// The owner signs approve/reject/pause/limits in their own wallet; Warden never holds that key.

import type { WalletSelector } from "@near-wallet-selector/core";
import type { WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { ApiError } from "./api/client";
import { toMicro } from "./format";
import type { OwnerWallet } from "./wallet";

export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";
export const NETWORK = (process.env.NEXT_PUBLIC_NEAR_NETWORK === "mainnet" ? "mainnet" : "testnet") as "mainnet" | "testnet";

const GAS = 30_000_000_000_000n; // 30 Tgas; the owner methods are simple state changes
const NO_DEPOSIT = 0n; // none of the owner methods are payable

/** Set before a redirect wallet (MyNearWallet) leaves the page, so we can finish the job on return. */
const PENDING_APPROVE_KEY = "warden:pending-approve";

let selectorPromise: Promise<{ selector: WalletSelector; modal: WalletSelectorModal }> | null = null;

/** Loads the selector lazily so the wallet code only ships to live-mode pages that need it. */
export function loadSelector() {
  if (!selectorPromise) {
    selectorPromise = (async () => {
      const [{ setupWalletSelector }, { setupModal }, { setupMyNearWallet }, { setupMeteorWallet }] = await Promise.all([
        import("@near-wallet-selector/core"),
        import("@near-wallet-selector/modal-ui"),
        import("@near-wallet-selector/my-near-wallet"),
        import("@near-wallet-selector/meteor-wallet"),
      ]);
      const selector = await setupWalletSelector({
        network: NETWORK,
        modules: [setupMeteorWallet(), setupMyNearWallet()],
      });
      const modal = setupModal(selector, { contractId: CONTRACT_ID, theme: "dark", description: "Connect the wallet that owns your Warden treasury." });
      return { selector, modal };
    })();
  }
  return selectorPromise;
}

export async function connectWallet() {
  const { modal } = await loadSelector();
  modal.show();
}

export async function disconnectWallet() {
  const { selector } = await loadSelector();
  if (!selector.isSignedIn()) return;
  const wallet = await selector.wallet();
  await wallet.signOut();
}

export function currentAccountId(selector: WalletSelector): string | null {
  return selector.store.getState().accounts.find((a) => a.active)?.accountId ?? null;
}

async function call(method: string, args: Record<string, unknown>) {
  const { selector } = await loadSelector();
  if (!selector.isSignedIn()) {
    throw new ApiError("Connect the owner wallet first.", "Use “Connect wallet” at the top of the page.");
  }
  const [{ actionCreators }, wallet] = await Promise.all([import("@near-wallet-selector/core"), selector.wallet()]);
  try {
    await wallet.signAndSendTransaction({
      receiverId: CONTRACT_ID,
      actions: [actionCreators.functionCall(method, args, GAS, NO_DEPOSIT)],
    });
  } catch (e) {
    throw toWalletError(e);
  }
}

/** Plain-English versions of the contract's panics and common wallet errors. */
export function toWalletError(e: unknown): ApiError {
  const raw = e instanceof Error ? e.message : String(e);
  if (/Only the owner/i.test(raw)) {
    return new ApiError("This wallet isn't the treasury owner.", "Switch to the owner account in your wallet and try again.");
  }
  if (/not Held/i.test(raw)) return new ApiError("This payment is no longer waiting for review.", "Refresh to see its current status.");
  if (/no longer active/i.test(raw)) return new ApiError("This supplier has been deactivated.", "Reactivate them in Treasury, or reject this invoice.");
  if (/reject|cancel|denied|closed/i.test(raw)) return new ApiError("You cancelled the signature in your wallet.", "Nothing was changed. Try again when ready.");
  return new ApiError(raw || "The wallet couldn't send the transaction.", "Check your wallet and try again.");
}

export function createNearOwnerWallet(): OwnerWallet {
  return {
    accountId: null,
    async signApprove(paymentId) {
      sessionStorage.setItem(PENDING_APPROVE_KEY, String(paymentId));
      try {
        await call("approve_payment", { id: paymentId });
      } finally {
        sessionStorage.removeItem(PENDING_APPROVE_KEY);
      }
    },
    signReject: (paymentId, reason) => call("reject_payment", { id: paymentId, reason }),
    signSetPaused: (paused) => call(paused ? "pause" : "unpause", {}),
    signSetLimits: (l) =>
      call("set_limits", {
        auto_pay_limit: toMicro(l.autoPayLimit).toString(),
        per_tx_cap: toMicro(l.perTxCap).toString(),
        daily_cap: toMicro(l.dailyCap).toString(),
      }),
  };
}

/**
 * Redirect wallets reload the page after signing, so the promise above never resolves.
 * On return, if an approval was in flight and the wallet sent back a tx hash, hand back
 * the payment id so the caller can ask the backend to execute it.
 */
export function takeReturnedApproval(): number | null {
  if (typeof window === "undefined") return null;
  const pending = sessionStorage.getItem(PENDING_APPROVE_KEY);
  const url = new URL(window.location.href);
  const hashes = url.searchParams.get("transactionHashes");
  const failed = url.searchParams.has("errorCode");
  if (hashes || failed) {
    for (const k of ["transactionHashes", "errorCode", "errorMessage"]) url.searchParams.delete(k);
    window.history.replaceState(null, "", url.toString());
  }
  if (!pending) return null;
  sessionStorage.removeItem(PENDING_APPROVE_KEY);
  return hashes && !failed ? Number(pending) : null;
}
