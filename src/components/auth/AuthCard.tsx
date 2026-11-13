import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

/** Small centred card used by the password-reset and email-verification pages. */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo is itself a link to the home page. */}
        <div className="mx-auto mb-6 w-fit">
          <Logo />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}
