import { describe, expect, it } from "vitest";
import { decimalToRaw, rawToDecimal } from "../src/money.js";

describe("money conversion (USDC, 6 decimals)", () => {
  it("converts raw smallest units to a decimal string", () => {
    expect(rawToDecimal("1350000")).toBe("1.35");
    expect(rawToDecimal("1000000")).toBe("1");
    expect(rawToDecimal("1000")).toBe("0.001");
    expect(rawToDecimal("0")).toBe("0");
  });

  it("converts a decimal string to raw smallest units", () => {
    expect(decimalToRaw("1.35")).toBe("1350000");
    expect(decimalToRaw("2")).toBe("2000000");
    expect(decimalToRaw("0.000001")).toBe("1");
  });

  it("round-trips without precision loss", () => {
    for (const d of ["1.35", "0.01", "10", "2.5", "0.1"]) {
      expect(rawToDecimal(decimalToRaw(d))).toBe(d);
    }
  });
});
