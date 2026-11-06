import { describe, expect, it } from "vitest";
import { toVerifyResult, withFileBase } from "./http";
import { assetSymbol } from "../format";
import type { InvoiceDetail } from "./types";

describe("toVerifyResult", () => {
  it("pairs each recomputed hash with the on-chain one", () => {
    const r = toVerifyResult({
      invoiceHashMatches: true,
      attestationHashMatches: false,
      recomputedInvoiceHash: "a1",
      recomputedAttestationHash: "b1",
      onChainInvoiceHash: "a1",
      onChainAttestationHash: "b2",
    });
    expect(r.invoiceHash).toEqual({ stored: "a1", onChain: "a1", match: true });
    expect(r.attestationHash).toEqual({ stored: "b1", onChain: "b2", match: false });
  });
});

describe("withFileBase", () => {
  const inv = (fileUrl: string | null) => ({ fileUrl }) as InvoiceDetail;

  it("prefixes backend-relative file links with the proxy path", () => {
    expect(withFileBase(inv("/invoices/x/file"), "/backend").fileUrl).toBe("/backend/invoices/x/file");
  });

  it("leaves absolute and missing links alone", () => {
    expect(withFileBase(inv("https://cdn.example/x.pdf"), "/backend").fileUrl).toBe("https://cdn.example/x.pdf");
    expect(withFileBase(inv(null), "/backend").fileUrl).toBeNull();
  });
});

describe("assetSymbol", () => {
  it("names known 1Click asset ids", () => {
    expect(assetSymbol("nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near")).toBe("USDC");
    expect(assetSymbol("nep141:sol-c800a4bd850783ccb82c2b2c7e84175443606352.omft.near")).toBe("USDT");
  });

  it("passes plain symbols through", () => {
    expect(assetSymbol("USDC")).toBe("USDC");
    expect(assetSymbol(null)).toBe("");
  });
});
