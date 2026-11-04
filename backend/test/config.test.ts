import { describe, expect, it } from "vitest";
import { config, Env, requireConfig } from "../src/config.js";

describe("config", () => {
  it("has safe defaults", () => {
    // Parsed independently of process.env/.env — `config` reflects this
    // repo's real .env (e.g. testnet for local dev), which isn't what
    // "default" means; the schema's own defaults are what's under test.
    const defaults = Env.parse({});
    expect(defaults.NEAR_NETWORK).toBe("mainnet");
    expect(defaults.WARDEN_FEE_BPS).toBe(0);
  });
  it("fails clearly when a required secret is missing", () => {
    const saved = config.ONECLICK_JWT;
    config.ONECLICK_JWT = undefined;
    expect(() => requireConfig("ONECLICK_JWT")).toThrow(/Missing ONECLICK_JWT/);
    config.ONECLICK_JWT = saved;
  });
});
