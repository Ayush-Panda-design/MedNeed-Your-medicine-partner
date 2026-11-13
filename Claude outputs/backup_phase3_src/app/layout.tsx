import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { appUrl } from "@/server/env";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "MedNeed: Online Pharmacy", template: "%s | MedNeed" },
  description: "Order medicines and health products online and get them delivered to your doorstep.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
