import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ButtonFx } from "@/components/ButtonFx";
import { Toaster } from "@/components/Toaster";
import { appUrl } from "@/server/env";
import { lexend } from "@/lib/fonts";
import { ThemeSync, themeScript } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "MedNeed: Online Pharmacy", template: "%s | MedNeed" },
  description: "Order medicines and health products online and get them delivered to your doorstep.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lexend.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeSync />
        <Providers>
          {children}
          <Toaster />
          <ScrollToTop />
          <ButtonFx />
        </Providers>
      </body>
    </html>
  );
}
