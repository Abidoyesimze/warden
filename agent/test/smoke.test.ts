import { describe, expect, it } from "vitest";
import * as agent from "../src/index.js";

describe("agent package", () => {
  it("loads", () => {
    expect(agent).toBeDefined();
  });
});
