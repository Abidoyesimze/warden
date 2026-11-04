import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

export interface InvoiceRow {
  id: string;
  file_name: string;
  file_type: "pdf" | "txt";
  file_path: string;
  preview_text: string;
  invoice_hash: string;
  payment_id: number | null;
  vendor_id: string | null;
  extracted_json: string;
  decision: "PAY" | "HOLD" | "BLOCK";
  rules_json: string;
  summary: string;
  attestation_json: string;
  receipt_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRow {
  id: number;
  payment_id: number;
  name: string;
  tx_hash: string | null;
  actor: string;
  detail: string | null;
  at: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  preview_text TEXT NOT NULL,
  invoice_hash TEXT NOT NULL,
  payment_id INTEGER,
  vendor_id TEXT,
  extracted_json TEXT NOT NULL,
  decision TEXT NOT NULL,
  rules_json TEXT NOT NULL,
  summary TEXT NOT NULL,
  attestation_json TEXT NOT NULL,
  receipt_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON invoices (payment_id);

-- Local mirror of on-chain events this backend itself caused, keyed by the
-- on-chain payment id. Owner-signed actions (approve/reject) happen directly
-- against the contract from the wallet, so they land here with tx_hash=NULL
-- the next time the backend reads the payment's new status — a known MVP
-- limitation (see docs/threat-model.md) rather than a NearBlocks indexer.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  tx_hash TEXT,
  actor TEXT NOT NULL,
  detail TEXT,
  at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_payment_id ON events (payment_id);
`;

export class WardenDb {
  readonly raw: Database.Database;

  constructor(dbPath: string) {
    mkdirSync(path.dirname(dbPath), { recursive: true });
    this.raw = new Database(dbPath);
    this.raw.pragma("journal_mode = WAL");
    this.raw.exec(SCHEMA);
  }

  insertInvoice(row: Omit<InvoiceRow, "receipt_json">): void {
    this.raw
      .prepare(
        `INSERT INTO invoices (id, file_name, file_type, file_path, preview_text, invoice_hash, payment_id,
          vendor_id, extracted_json, decision, rules_json, summary, attestation_json, created_at, updated_at)
         VALUES (@id, @file_name, @file_type, @file_path, @preview_text, @invoice_hash, @payment_id,
          @vendor_id, @extracted_json, @decision, @rules_json, @summary, @attestation_json, @created_at, @updated_at)`,
      )
      .run(row);
  }

  setReceipt(invoiceId: string, receiptJson: string, updatedAt: string): void {
    this.raw
      .prepare("UPDATE invoices SET receipt_json = ?, updated_at = ? WHERE id = ?")
      .run(receiptJson, updatedAt, invoiceId);
  }

  getInvoice(id: string): InvoiceRow | undefined {
    return this.raw.prepare("SELECT * FROM invoices WHERE id = ?").get(id) as InvoiceRow | undefined;
  }

  getInvoiceByPaymentId(paymentId: number): InvoiceRow | undefined {
    return this.raw.prepare("SELECT * FROM invoices WHERE payment_id = ?").get(paymentId) as
      | InvoiceRow
      | undefined;
  }

  listInvoices(): InvoiceRow[] {
    return this.raw.prepare("SELECT * FROM invoices ORDER BY created_at DESC").all() as InvoiceRow[];
  }

  hasInvoiceHash(hash: string): boolean {
    return this.raw.prepare("SELECT 1 FROM invoices WHERE invoice_hash = ?").get(hash) !== undefined;
  }

  addEvent(event: Omit<EventRow, "id" | "detail"> & { detail?: string | null }): void {
    this.raw
      .prepare("INSERT INTO events (payment_id, name, tx_hash, actor, detail, at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(event.payment_id, event.name, event.tx_hash, event.actor, event.detail ?? null, event.at);
  }

  listEvents(paymentId: number): EventRow[] {
    return this.raw
      .prepare("SELECT * FROM events WHERE payment_id = ? ORDER BY at ASC, id ASC")
      .all(paymentId) as EventRow[];
  }

  close(): void {
    this.raw.close();
  }
}
