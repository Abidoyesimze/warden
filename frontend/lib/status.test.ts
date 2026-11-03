import { describe, expect, it } from "vitest";
import { formatAmount, fromMicro, toMicro } from "./format";
import { ownerStatus } from "./status";

describe("status mapping", () => {
  it("maps contract statuses to owner labels", () => {
    expect(ownerStatus("Settled").label).toBe("Paid");
    expect(ownerStatus("Sending").label).toBe("Processing");
    expect(ownerStatus("Held").label).toBe("Under review");
    expect(ownerStatus("Refunded").tone).toBe("muted");
  });
  it("shows a rule block as Blocked and an owner rejection as Rejected", () => {
    expect(ownerStatus("Rejected", ["BLOCK:DUPLICATE_NUMBER"]).label).toBe("Blocked");
    expect(ownerStatus("Rejected", ["DEST_MISMATCH"]).label).toBe("Rejected");
  });
});

describe("money formatting", () => {
  it("keeps decimal strings exact", () => {
    expect(formatAmount("1.2")).toBe("1.20");
    expect(formatAmount("1234.5")).toBe("1,234.50");
    expect(fromMicro(toMicro("12.81") - toMicro("2.50"))).toBe("10.31");
  });
});
