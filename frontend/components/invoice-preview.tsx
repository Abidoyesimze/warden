import { EyeOff } from "lucide-react";
import type { InvoiceDetail } from "@/lib/api/types";
import { cn } from "@/lib/format";

/** The original invoice. Live mode embeds the PDF; demo mode shows the text Warden read. Hidden text is revealed and marked. */
export function InvoicePreview({ invoice }: { invoice: InvoiceDetail }) {
  if (invoice.fileUrl && invoice.fileType === "pdf") {
    return <iframe src={invoice.fileUrl} title={`Original invoice ${invoice.fileName}`} className="h-[640px] w-full rounded-input bg-white" />;
  }
  const hidden = invoice.extracted.instructions_found;
  const badAddress =
    invoice.vendor && invoice.extracted.payment_details.address && invoice.extracted.payment_details.address.toLowerCase() !== invoice.vendor.destAddress.toLowerCase()
      ? invoice.extracted.payment_details.address
      : null;
  const lines = invoice.previewText.split("\n");
  return (
    <div className="overflow-x-auto rounded-input border border-line bg-bg">
      <pre className="num min-w-[520px] px-5 py-4 text-[11.5px] leading-[1.7] text-fg/85">
        {lines.map((line, i) => {
          const isHidden = hidden.some((h) => line.includes(h.slice(0, 40)));
          const isAddress = !isHidden && badAddress && line.includes(badAddress);
          if (isHidden) {
            return (
              <span key={i} className="my-1 block rounded-[3px] border border-dashed border-coral/50 bg-coral/[0.07] px-2 py-1 whitespace-pre-wrap text-coral">
                <span className="mb-0.5 flex items-center gap-1.5 font-sans text-[11px] font-medium">
                  <EyeOff className="size-3" strokeWidth={1.5} />
                  Hidden text, invisible in the PDF (revealed by Warden)
                </span>
                {line}
              </span>
            );
          }
          return (
            <span key={i} className={cn("block whitespace-pre", isAddress && "bg-coral/10 text-coral", i === 0 && "font-semibold text-fg")}>
              {line || " "}
            </span>
          );
        })}
      </pre>
    </div>
  );
}
