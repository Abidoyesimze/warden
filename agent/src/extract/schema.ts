import { z } from "zod";

// The model extracts fields only. It never decides whether to pay, and
// invoice text is untrusted input — anything that looks like an instruction
// goes into instructions_found instead of being followed.
export const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.string(),
  unit_price: z.string(),
  amount: z.string(),
});

export const PaymentDetailsSchema = z.object({
  method: z.enum(["crypto", "bank", "unknown"]),
  chain: z.string().nullable(),
  asset: z.string().nullable(),
  address: z.string().nullable(),
  bank_name: z.string().nullable(),
});

export const ExtractedInvoiceSchema = z.object({
  vendor_name: z.string(),
  vendor_identifier: z.string().nullable(),
  invoice_number: z.string(),
  issue_date: z.string(),
  due_date: z.string().nullable(),
  currency: z.string(),
  total_amount: z.string(),
  line_items: z.array(LineItemSchema),
  payment_details: PaymentDetailsSchema,
  instructions_found: z.array(z.string()),
  extraction_confidence: z.enum(["high", "medium", "low"]),
});

export type LineItem = z.infer<typeof LineItemSchema>;
export type PaymentDetails = z.infer<typeof PaymentDetailsSchema>;
export type ExtractedInvoice = z.infer<typeof ExtractedInvoiceSchema>;
