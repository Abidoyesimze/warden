import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtractedInvoice, HistoryEntry, VendorRecord } from "@warden/agent";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp, type AppDeps } from "../src/app.js";
import { WardenDb } from "../src/db/index.js";
import { FakeChain } from "./fake-chain.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixturesDir = path.join(repoRoot, "fixtures");

function loadFixtures() {
  const vendors = JSON.parse(readFileSync(path.join(fixturesDir, "vendors.json"), "utf-8")) as VendorRecord[];
  const historyByVendor: Record<string, HistoryEntry[]> = {};
  for (const entry of readdirSync(path.join(fixturesDir, "history"))) {
    if (!entry.endsWith(".json")) continue;
    historyByVendor[entry.replace(/\.json$/, "")] = JSON.parse(
      readFileSync(path.join(fixturesDir, "history", entry), "utf-8"),
    ) as HistoryEntry[];
  }
  return { vendors, historyByVendor };
}

const NORMAL_EXTRACTED = JSON.parse(
  readFileSync(path.join(fixturesDir, "invoices", "01-normal.extracted.json"), "utf-8"),
) as ExtractedInvoice;

const HELD_EXTRACTED = JSON.parse(
  readFileSync(path.join(fixturesDir, "invoices", "06-inflated-amount.extracted.json"), "utf-8"),
) as ExtractedInvoice;

function fakeDeps(extracted: ExtractedInvoice, chain: FakeChain): AppDeps {
  const { vendors, historyByVendor } = loadFixtures();
  return {
    db: new WardenDb(":memory:"),
    chain,
    extract: async () => ({
      extracted,
      chatId: "chat_test_1",
      model: "test-model",
      rawResponseText: JSON.stringify(extracted),
    }),
    attest: async (model, chatId) => ({
      model,
      chatId,
      report: { signing_address: "0xmodelkey" },
      signature: { sig: "deadbeef" },
      fetchedAt: new Date("2026-11-03T12:00:00Z").toISOString(),
    }),
    vendors,
    historyByVendor,
    dataDir: mkdtempSync(path.join(tmpdir(), "warden-test-")),
    contractId: "warden.test.near",
    usdcTokenId: "usdc.test.near",
    oneclick: {
      getQuote: async (req) => ({
        depositAddress: "deposit.test.near",
        amountOut: req.amount,
        amountOutFormatted: "1.35",
        deadline: new Date(Date.now() + 10 * 60_000).toISOString(),
      }),
      verifyQuote: (quote, expected) => {
        if (new Date(quote.deadline).getTime() <= Date.now()) return { ok: false, reason: "expired" };
        if (Number(quote.amountOut) / Number(expected.amount) < 0.98) return { ok: false, reason: "low output" };
        return { ok: true };
      },
      submitDeposit: async () => {},
      pollUntilSettled: async () => ({
        status: "SUCCESS",
        destinationChainTxHashes: [{ hash: "0xdesttxhash" }],
      }),
    },
  };
}

async function uploadInvoice(deps: AppDeps): Promise<{ invoiceId: string; status: string; decision: string }> {
  const app = createApp(deps);
  const res = await request(app).post("/invoices").attach("file", Buffer.from("invoice text"), "invoice.txt");
  const lines = res.text.trim().split("\n").map((l) => JSON.parse(l));
  const done = lines.at(-1);
  expect(done.stage).toBe("done");
  return done;
}

describe("backend pipeline + routes (fakes, no real secrets)", () => {
  let chain: FakeChain;
  let deps: AppDeps;

  beforeEach(() => {
    const { vendors } = loadFixtures();
    chain = new FakeChain(vendors);
  });

  afterEach(() => {
    deps?.db.close();
  });

  it("pays a normal invoice end to end (upload -> extract -> rules -> propose -> stored)", async () => {
    deps = fakeDeps(NORMAL_EXTRACTED, chain);
    const done = await uploadInvoice(deps);
    expect(done.decision).toBe("PAY");
    expect(done.status).toBe("Approved");

    const app = createApp(deps);
    const detail = await request(app).get(`/invoices/${done.invoiceId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.payment.status).toBe("Approved");
    expect(detail.body.payment.vendorName).toBe("Shenzhen Packaging Co.");
    expect(detail.body.rules).toHaveLength(10);
    expect(detail.body.attestation.hash).toBeTruthy();
  });

  it("holds an inflated invoice and records the AMOUNT_ANOMALY flag", async () => {
    deps = fakeDeps(HELD_EXTRACTED, chain);
    const done = await uploadInvoice(deps);
    expect(done.decision).toBe("HOLD");
    expect(done.status).toBe("Held");

    const app = createApp(deps);
    const review = await request(app).get("/payments/review");
    expect(review.body).toHaveLength(1);
    expect(review.body[0].topFlag).toBe("AMOUNT_ANOMALY");
  });

  it("GET /treasury reports balance, limits and vendors from chain", async () => {
    deps = fakeDeps(NORMAL_EXTRACTED, chain);
    const app = createApp(deps);
    const res = await request(app).get("/treasury");
    expect(res.status).toBe(200);
    expect(res.body.contractId).toBe("warden.test.near");
    expect(res.body.balance).toBe("10");
    expect(res.body.limits.autoPayLimit).toBe("2");
    expect(res.body.vendors.length).toBe(3);
  });

  it("executes an approved payment through 1Click and records the receipt", async () => {
    deps = fakeDeps(NORMAL_EXTRACTED, chain);
    const done = await uploadInvoice(deps);
    expect(done.status).toBe("Approved");

    const app = createApp(deps);
    const exec = await request(app).post(`/payments/${chain.nextId - 1}/execute`).send({});
    expect(exec.status).toBe(200);
    expect(exec.body.status).toBe("Settled");
    expect(exec.body.receipt.destTxHash).toBe("0xdesttxhash");

    const detail = await request(app).get(`/invoices/${done.invoiceId}`);
    expect(detail.body.receipt.destTxHash).toBe("0xdesttxhash");
    expect(detail.body.payment.status).toBe("Settled");
  });

  it("rejects executing a payment that is not yet Approved", async () => {
    deps = fakeDeps(HELD_EXTRACTED, chain);
    await uploadInvoice(deps);
    const app = createApp(deps);
    const res = await request(app).post(`/payments/${chain.nextId - 1}/execute`).send({});
    expect(res.status).toBe(422);
  });

  it("verify recomputes hashes and matches the on-chain record", async () => {
    deps = fakeDeps(NORMAL_EXTRACTED, chain);
    const done = await uploadInvoice(deps);
    const app = createApp(deps);
    const res = await request(app).post(`/invoices/${done.invoiceId}/verify`);
    expect(res.status).toBe(200);
    expect(res.body.invoiceHashMatches).toBe(true);
    expect(res.body.attestationHashMatches).toBe(true);
  });
});
