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
      <p className="au-text">
        This link is incomplete. <Link href="/forgot-password" className="au-link">Ask for a new one</Link>.
      </p>
    );
  }

  if (done) {
    return (
      <div className="au-pane" role="status">
        <p className="au-msg">
          <CheckCircle2 aria-hidden />
          <span>Your password has been changed and you&apos;ve been signed out on all devices.</span>
        </p>
        <Link href="/login" className="au-btn">Sign in</Link>
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

  const field = "au-field";
  return (
    <form onSubmit={submit} noValidate className="au-pane">
      <label htmlFor="pw" className="au-label">New password</label>
      <div className="au-pw">
        <input id="pw" type={show ? "text" : "password"} autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="au-eye">
          {show ? <EyeOff /> : <Eye />}
        </button>
      </div>
      <p className="au-hint">At least 8 characters. Avoid common passwords.</p>
      <label htmlFor="pw2" className="au-label au-field-gap">Confirm new password</label>
      <input id="pw2" type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
      {error && (
        <p role="alert" className="au-err">
          {error}
          {/expired|used/i.test(error) && <> <Link href="/forgot-password" className="au-link">Get a new link</Link></>}
        </p>
      )}
      <button disabled={busy} className="au-btn">
        {busy && <Loader2 className="animate-spin" aria-hidden />} Save new password
      </button>
    </form>
  );
}
