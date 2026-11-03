"use client";

import { FileText, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/format";

const ACCEPT = [".pdf", ".txt"];
const IMAGE = /\.(png|jpe?g|gif|webp|heic|tiff?|bmp)$/i;
const MAX_BYTES = 5 * 1024 * 1024;

export function UploadDropzone({ onFile, disabled }: { onFile: (f: File) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const take = (f: File | undefined) => {
    if (!f) return;
    setNotice(null);
    if (IMAGE.test(f.name) || f.type.startsWith("image/")) {
      setNotice("Scanned images aren't supported yet. Please upload the invoice as a PDF or .txt file.");
      return;
    }
    if (!ACCEPT.some((ext) => f.name.toLowerCase().endsWith(ext))) {
      setNotice("Warden reads PDF and .txt invoices. Export the invoice as a PDF and try again.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setNotice("That file is larger than 5 MB. Invoices are usually much smaller. Check you picked the right file.");
      return;
    }
    onFile(f);
  };

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!disabled) take(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-card border border-dashed px-6 py-12 text-center transition-colors duration-150",
          over ? "border-fg bg-surface-2" : "border-[var(--border-strong)] bg-surface-1 hover:bg-surface-2",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-card hairline bg-surface-2">
          {over ? <FileText className="size-5 text-fg" strokeWidth={1.5} /> : <Upload className="size-5 text-muted" strokeWidth={1.5} />}
        </span>
        <span>
          <span className="block text-[14px] font-medium text-fg">Drop an invoice here, or click to choose</span>
          <span className="mt-1 block text-[12px] text-muted">PDF or .txt, up to 5 MB. Read privately inside a secure enclave.</span>
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        className="sr-only"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {notice && (
        <p role="status" className="mt-2 text-[13px] text-amber">
          {notice}
        </p>
      )}
    </div>
  );
}
