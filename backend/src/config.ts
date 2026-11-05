import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

// One .env at the repo root is shared by agent/ and backend/.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(repoRoot, ".env"), quiet: true });

// Secrets are optional here so tests and the offline fraud suite run without them.
// Code that needs one calls requireConfig(), which fails with a clear message.
export const Env = z.object({
  NEAR_NETWORK: z.enum(["mainnet", "testnet"]).default("mainnet"),
  // rpc.mainnet.near.org is deprecated/rate-limited; FastNEAR is the
  // NEAR-docs-recommended replacement (test.rpc.fastnear.com for testnet).
  NEAR_RPC_URL: z.string().url().default("https://free.rpc.fastnear.com"),
  TREASURY_CONTRACT_ID: z.string().optional(),
  AGENT_ACCOUNT_ID: z.string().optional(),
  AGENT_PRIVATE_KEY: z.string().optional(),
  OWNER_ACCOUNT_ID: z.string().optional(),
  USDC_TOKEN_ID: z.string().optional(),
  NEAR_AI_API_KEY: z.string().optional(),
  NEAR_AI_MODEL: z.string().optional(),
  ONECLICK_BASE_URL: z.string().url().default("https://1click.chaindefuser.com"),
  ONECLICK_JWT: z.string().optional(),
  WARDEN_FEE_BPS: z.coerce.number().int().min(0).max(10_000).default(0),
  DB_PATH: z.string().default("./data/warden.sqlite"),
  PORT: z.coerce.number().int().default(4000),
});

export type Config = z.infer<typeof Env>;
export const config: Config = Env.parse(process.env);
export { repoRoot };

export function requireConfig<K extends keyof Config>(key: K): NonNullable<Config[K]> {
  const v = config[key];
  if (v === undefined || v === "") throw new Error(`Missing ${String(key)} in .env`);
  return v as NonNullable<Config[K]>;
}
