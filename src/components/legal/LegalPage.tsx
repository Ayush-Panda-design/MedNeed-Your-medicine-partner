import Link from "next/link";
import type { ReactNode } from "react";

/** Shared layout for the policy pages. Content lives in each page so a lawyer's edits stay in one obvious file per policy. */
export function LegalPage({ title, updated, reviewed, children }: { title: string; updated: string; reviewed: boolean; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden>/</span> <span className="text-ink-2">{title}</span>
      </nav>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-ink-muted">Last updated {updated}</p>
      {!reviewed && (
        <p role="note" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This policy is being finalised. If you have any question about it, please <Link href="/contact" className="font-semibold underline">contact us</Link>.
        </p>
      )}
      <div className="legal-prose mt-8 space-y-4 text-[15px] leading-relaxed text-ink-2">{children}</div>
      <p className="mt-12 border-t border-line pt-6 text-sm text-ink-muted">
        See also: <Link href="/privacy" className="underline hover:text-ink">Privacy</Link> · <Link href="/terms" className="underline hover:text-ink">Terms</Link> ·{" "}
        <Link href="/refunds" className="underline hover:text-ink">Cancellation &amp; refunds</Link> · <Link href="/shipping" className="underline hover:text-ink">Shipping &amp; delivery</Link> ·{" "}
        <Link href="/contact" className="underline hover:text-ink">Contact</Link>
      </p>
    </main>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="!mt-9 text-xl font-semibold text-ink">{children}</h2>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-teal-600">{children}</ul>;
}

/** A business detail from Admin → Shop settings, or a visible placeholder when it has not been filled in yet. */
export function Detail({ value, missing }: { value: string; missing: string }) {
  return value.trim() ? <>{value}</> : <span className="rounded bg-amber-100 px-1 text-amber-900">[{missing} to be added]</span>;
}

export const POLICY_DATE = "13 November 2026";
