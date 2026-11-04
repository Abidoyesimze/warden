import { PDFParse } from "pdf-parse";

/** PDF -> text with pdf-parse; .txt is used as-is. Text-only PDFs for the MVP. */
export async function readInvoiceText(buffer: Buffer, fileType: "pdf" | "txt"): Promise<string> {
  if (fileType === "txt") return buffer.toString("utf-8");

  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
