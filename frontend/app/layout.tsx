import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Warden", template: "%s · Warden" },
  description:
    "Warden is an AI finance agent that pays small businesses' cross-border supplier invoices in stablecoins and stops fake or altered invoices before any money moves. Built on NEAR.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
