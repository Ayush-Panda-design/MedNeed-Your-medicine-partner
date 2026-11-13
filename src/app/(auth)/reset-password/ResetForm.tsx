"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Keep the token out of the address bar and browser history once the page has it.
  useEffect(() => {
    if (token && window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);

  if (!token) {
    return (
      <p className="mt-3 text-slate-700">
        This link is incomplete. <Link href="/forgot-password" className="font-semibold text-teal-700 hover:underline">Ask for a new one</Link>.
      </p>
    );
  }

  if (done) {
    return (
      <div className="mt-4" role="status">
        <p className="flex items-start gap-2 text-slate-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" aria-hidden />
          <span>Your password has been changed and you&apos;ve been signed out on all devices.</span>
        </p>
        <Link href="/login" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white hover:bg-teal-700">Sign in</Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    const res = await api("/api/auth/password/reset", { body: { token, password } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setDone(true);
  }

  const field = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
  return (
    <form onSubmit={submit} noValidate className="mt-2">
      <label htmlFor="pw" className="mt-4 block text-sm font-medium">New password</label>
      <div className="relative">
        <input id="pw" type={show ? "text" : "password"} autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className={`${field} pr-12`} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-slate-400 hover:text-slate-700">
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">At least 8 characters. Avoid common passwords.</p>
      <label htmlFor="pw2" className="mt-4 block text-sm font-medium">Confirm new password</label>
      <input id="pw2" type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {error}
          {/expired|used/i.test(error) && <> <Link href="/forgot-password" className="font-semibold underline">Get a new link</Link></>}
        </p>
      )}
      <button disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save new password
      </button>
    </form>
  );
}
