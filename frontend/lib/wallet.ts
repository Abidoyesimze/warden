// Owner wallet actions. In demo mode signing is simulated.
// Live mode will use NEAR Wallet Selector to call approve_payment / reject_payment on the treasury
// contract; it is connected once the contract is deployed (see docs/api.md).

export interface OwnerWallet {
  accountId: string | null;
  signApprove(paymentId: number): Promise<void>;
  signReject(paymentId: number, reason: string): Promise<void>;
  signSetPaused(paused: boolean): Promise<void>;
  signSetLimits(limits: { autoPayLimit: string; perTxCap: string; dailyCap: string }): Promise<void>;
}

const notConnected = (): Promise<never> =>
  Promise.reject(new Error("Wallet signing isn't connected yet. Turn on demo mode or connect the treasury contract."));

let wallet: OwnerWallet = {
  accountId: null,
  signApprove: notConnected,
  signReject: notConnected,
  signSetPaused: notConnected,
  signSetLimits: notConnected,
};

export function getWallet(): OwnerWallet {
  return wallet;
}

/** Lets the Wallet Selector integration register itself at startup. */
export function setWallet(w: OwnerWallet) {
  wallet = w;
}
