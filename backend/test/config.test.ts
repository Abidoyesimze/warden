import { describe, expect, it } from "vitest";
import { config, requireConfig } from "../src/config.js";

describe("config", () => {
  it("has safe defaults", () => {
    expect(config.NEAR_NETWORK).toBe("mainnet");
    expect(config.WARDEN_FEE_BPS).toBe(0);
  });
  it("fails clearly when a required secret is missing", () => {
    const saved = config.ONECLICK_JWT;
    config.ONECLICK_JWT = undefined;
    expect(() => requireConfig("ONECLICK_JWT")).toThrow(/Missing ONECLICK_JWT/);
    config.ONECLICK_JWT = saved;
  });
});
