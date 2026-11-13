"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { api } from "@/lib/api";

export function ForgotForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    setBusy(true);
    const res = await api<{ sent: boolean; devLink?: string }>("/api/auth/password/forgot", { body: { email } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setDevLink(res.data.devLink ?? "");
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-4" role="status">
        <p className="flex items-start gap-2 text-slate-700">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" aria-hidden />
          <span>If an account exists for <strong className="break-all">{email}</strong>, we&apos;ve sent it a link to choose a new password. It works once and expires in 30 minutes. Check your spam folder if you don&apos;t see it.</span>
        </p>
        {devLink && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Development mode: no email is sent. <a href={devLink} className="font-semibold underline" data-testid="dev-link">Open the reset link</a>
          </p>
        )}
        <p className="mt-6 text-sm"><Link href="/login" className="font-semibold text-teal-700 hover:underline">Back to sign in</Link></p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-2">
      <p className="text-sm text-slate-600">Enter the email you use for your account and we&apos;ll send you a link to reset your password.</p>
      <label htmlFor="email" className="mt-5 block text-sm font-medium">Email</label>
      <input id="email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" placeholder="you@example.com" />
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      <button disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Send reset link
      </button>
      <p className="mt-4 text-center text-sm text-slate-600">
        Signed up with your phone? <Link href="/login" className="font-semibold text-teal-700 hover:underline">Sign in with an OTP</Link> instead.
      </p>
    </form>
  );
}
