import type { Metadata, Viewport } from "next";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "./SignOutButton";

export const metadata: Metadata = { title: "My deliveries", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// A small phone-first shell for delivery people: no shop navigation, no cart.
export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-emerald-900 px-4 py-3 text-white">
        <Logo light size="sm" entrance={false} />
        <SignOutButton />
      </header>
      <main className="mx-auto max-w-lg p-4">{children}</main>
    </div>
  );
}
