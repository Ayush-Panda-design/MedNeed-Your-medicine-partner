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
      <div className="au-pane" role="status">
        <p className="au-msg">
          <MailCheck aria-hidden />
          <span>If an account exists for <strong className="break-all">{email}</strong>, we&apos;ve sent it a link to choose a new password. It works once and expires in 30 minutes. Check your spam folder if you don&apos;t see it.</span>
        </p>
        {devLink && (
          <p className="au-devnote">
            Development mode: no email is sent. <a href={devLink} className="font-semibold underline" data-testid="dev-link">Open the reset link</a>
          </p>
        )}
        <p className="au-switch"><Link href="/login" className="au-link">Back to sign in</Link></p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="au-pane">
      <p className="au-text">Enter the email you use for your account and we&apos;ll send you a link to reset your password.</p>
      <label htmlFor="email" className="au-label au-field-gap">Email</label>
      <input id="email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="au-field" placeholder="you@example.com" />
      {error && <p role="alert" className="au-err">{error}</p>}
      <button disabled={busy} className="au-btn">
        {busy && <Loader2 className="animate-spin" aria-hidden />} Send reset link
      </button>
      <p className="au-switch">
        Signed up with your phone? <Link href="/login" className="au-link">Sign in with an OTP</Link> instead.
      </p>
    </form>
  );
}
