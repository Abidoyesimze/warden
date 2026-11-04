import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { extractInvoice, fetchAttestationEvidence, type HistoryEntry, type VendorRecord } from "@warden/agent";
import { createApp, type AppDeps } from "./app.js";
import { TreasuryChainClient } from "./chain/client.js";
import { config, repoRoot, requireConfig } from "./config.js";
import { WardenDb } from "./db/index.js";
import { createOneClickOps } from "./oneclick-ops.js";

function loadFixtures(): { vendors: VendorRecord[]; historyByVendor: Record<string, HistoryEntry[]> } {
  const fixturesDir = path.join(repoRoot, "fixtures");
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

export function buildAppDeps(): AppDeps {
  const { vendors, historyByVendor } = loadFixtures();
  const chain = TreasuryChainClient.fromConfig({
    rpcUrl: config.NEAR_RPC_URL,
    contractId: requireConfig("TREASURY_CONTRACT_ID"),
    agentAccountId: requireConfig("AGENT_ACCOUNT_ID"),
    agentPrivateKey: requireConfig("AGENT_PRIVATE_KEY"),
  });

  return {
    db: new WardenDb(path.resolve(repoRoot, config.DB_PATH)),
    chain,
    extract: (text) =>
      extractInvoice(text, { apiKey: requireConfig("NEAR_AI_API_KEY"), model: requireConfig("NEAR_AI_MODEL") }),
    attest: (model, chatId) => fetchAttestationEvidence({ apiKey: requireConfig("NEAR_AI_API_KEY"), model, chatId }),
    vendors,
    historyByVendor,
    dataDir: path.resolve(repoRoot, "data"),
    contractId: requireConfig("TREASURY_CONTRACT_ID"),
    usdcTokenId: requireConfig("USDC_TOKEN_ID"),
    oneclick: createOneClickOps({
      baseUrl: config.ONECLICK_BASE_URL,
      jwt: requireConfig("ONECLICK_JWT"),
      feeBps: config.WARDEN_FEE_BPS,
    }),
  };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop()!)) {
  const app = createApp(buildAppDeps());
  app.listen(config.PORT, () => console.log(`Warden backend on :${config.PORT}`));
}
