import { describe, expect, it } from "vitest";
import { toWalletError } from "./near-wallet";

describe("toWalletError", () => {
  it("explains the contract's owner check", () => {
    expect(toWalletError(new Error("Smart contract panicked: assertion `left == right` failed: Only the owner")).message).toBe(
      "This wallet isn't the treasury owner.",
    );
  });

  it("explains a payment that was already handled", () => {
    expect(toWalletError(new Error("Smart contract panicked: Payment is not Held")).message).toMatch(/no longer waiting/);
  });

  it("treats a closed wallet popup as a cancel", () => {
    expect(toWalletError(new Error("User rejected the request")).message).toMatch(/cancelled/);
  });
});
