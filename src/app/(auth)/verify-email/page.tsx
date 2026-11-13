import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { consumeEmailLink } from "@/server/auth/email-links";
import { audit } from "@/server/auth/users";

export const metadata: Metadata = { title: "Confirm email", robots: { index: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const result = typeof token === "string"
    ? await consumeEmailLink(token, "verify_email", async (t, row) => {
        await t.query(`update users set email_verified = true, updated_at = now() where id = $1`, [row.userId]);
        return row;
      })
    : null;
  if (result) await audit(result.userId, "user.email_verified");

  return (
    <AuthCard title={result ? "Email confirmed" : "Link not valid"}>
      {result ? (
        <p className="mt-4 flex items-start gap-2 text-slate-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" aria-hidden />
          <span>Thanks, <strong className="break-all">{result.email}</strong> is confirmed. We&apos;ll send your order updates there.</span>
        </p>
      ) : (
        <p className="mt-4 flex items-start gap-2 text-slate-700">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
          <span>This link has expired or was already used. You can send a new one from your account page.</span>
        </p>
      )}
      <Link href="/account" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white hover:bg-teal-700">Go to my account</Link>
    </AuthCard>
  );
}
