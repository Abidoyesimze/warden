import OpenAI from "openai";
import { ExtractedInvoiceSchema, type ExtractedInvoice } from "./schema.js";
import { MAX_INVOICE_CHARS, SYSTEM_PROMPT, buildUserPrompt } from "./prompt.js";

export interface ExtractionClientOptions {
  apiKey: string;
  model: string;
  baseURL?: string;
}

export interface ExtractionResult {
  extracted: ExtractedInvoice;
  chatId: string;
  model: string;
  rawResponseText: string;
}

const DEFAULT_BASE_URL = "https://cloud-api.near.ai/v1";

function client(opts: ExtractionClientOptions): OpenAI {
  return new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL ?? DEFAULT_BASE_URL });
}

/**
 * Reads an invoice privately on NEAR AI Cloud (runs in a TEE for models that
 * support it — see HACKATHON-NOTES.md for the chosen model) and returns
 * structured fields only. The model never sees anything but the raw text
 * and never influences the pay/hold/block decision; that happens entirely
 * in ../risk, in plain deterministic code.
 */
export async function extractInvoice(
  invoiceText: string,
  opts: ExtractionClientOptions,
): Promise<ExtractionResult> {
  const text = invoiceText.slice(0, MAX_INVOICE_CHARS);
  const oai = client(opts);

  const parseAttempt = async (): Promise<{ chatId: string; content: string }> => {
    const completion = await oai.chat.completions.create({
      model: opts.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(text) },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("NEAR AI Cloud returned an empty response");
    return { chatId: completion.id, content };
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { chatId, content } = await parseAttempt();
      const extracted = ExtractedInvoiceSchema.parse(JSON.parse(content));
      return { extracted, chatId, model: opts.model, rawResponseText: content };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Invoice extraction failed after retry: ${String(lastError)}`);
}

export interface ModelInfo {
  id: string;
  verifiable?: boolean;
  attestationSupported?: boolean;
  providerType?: string;
}

/** GET /v1/model/list — used at setup time to pick a TEE-hosted model; never hard-code model IDs. */
export async function listModels(opts: { apiKey: string; baseURL?: string }): Promise<ModelInfo[]> {
  const oai = client({ apiKey: opts.apiKey, model: "", baseURL: opts.baseURL });
  const res = await oai.models.list();
  return res.data as unknown as ModelInfo[];
}
