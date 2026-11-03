"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Amount } from "@/components/amount";
import { Hash } from "@/components/hash";
import type { Confidence, ExtractedInvoice, Vendor } from "@/lib/api/types";
import { chainName, cn, formatDate } from "@/lib/format";

const CONFIDENCE: Record<Confidence, string> = {
  high: "text-fg",
  medium: "text-amber",
  low: "text-coral",
};

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("min-w-0", wide && "col-span-2")}
    >
      <dt className="label">{label}</dt>
      <dd className="mt-1 min-w-0 text-[13px] text-fg">{children}</dd>
    </motion.div>
  );
}

/** Fields read from the invoice. Fades each field in as it arrives during upload. */
export function ExtractedFields({
  data,
  vendor,
  full = false,
}: {
  data: Partial<ExtractedInvoice>;
  vendor?: Vendor | null;
  full?: boolean;
}) {
  const pd = data.payment_details;
  const addressDiffers = !!(vendor && pd?.address && pd.address.toLowerCase() !== vendor.destAddress.toLowerCase());
  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <AnimatePresence>
          {data.vendor_name !== undefined && (
            <Field key="vendor" label="Supplier">
              <span className="block truncate">{data.vendor_name}</span>
              {data.vendor_identifier && <span className="block truncate text-[12px] text-muted">{data.vendor_identifier}</span>}
            </Field>
          )}
          {data.total_amount !== undefined && (
            <Field key="amount" label="Amount">
              <Amount value={data.total_amount} currency={data.currency ?? null} size="lg" />
            </Field>
          )}
          {data.invoice_number !== undefined && (
            <Field key="number" label="Invoice number">
              <span className="num">{data.invoice_number}</span>
            </Field>
          )}
          {data.due_date !== undefined && (
            <Field key="due" label="Due date">
              <span className="num">{formatDate(data.due_date)}</span>
              {data.issue_date && <span className="block text-[12px] text-muted">Issued {formatDate(data.issue_date)}</span>}
            </Field>
          )}
          {data.extraction_confidence !== undefined && (
            <Field key="conf" label="Reading confidence">
              <span className={cn("capitalize", CONFIDENCE[data.extraction_confidence])}>{data.extraction_confidence}</span>
            </Field>
          )}
          {full && pd && (
            <Field key="pay" label="Payment details on invoice">
              {pd.address ? (
                <>
                  <span className={cn("block", addressDiffers && "text-coral")}>
                    {pd.asset ?? "Crypto"} {pd.chain ? `on ${chainName(pd.chain)}` : ""}
                  </span>
                  <Hash value={pd.address} head={8} tail={6} className={addressDiffers ? "[&>span:first-child]:text-coral" : ""} />
                </>
              ) : (
                <span className="text-muted">None written. Warden uses the approved address.</span>
              )}
            </Field>
          )}
        </AnimatePresence>
      </dl>

      {full && data.line_items && data.line_items.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="label py-2 pr-3 font-medium">Line item</th>
                <th className="label py-2 pr-3 text-right font-medium">Qty</th>
                <th className="label py-2 pr-3 text-right font-medium">Unit</th>
                <th className="label py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.line_items.map((l, i) => (
                <tr key={i} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-3 text-fg">{l.description}</td>
                  <td className="num py-2 pr-3 text-right text-muted">{l.quantity}</td>
                  <td className="num py-2 pr-3 text-right text-muted">{l.unit_price}</td>
                  <td className="num py-2 text-right text-fg">{l.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
