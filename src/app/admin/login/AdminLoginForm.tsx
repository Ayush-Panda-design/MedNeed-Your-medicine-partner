"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AlertCircle, Copy, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/providers";

type Step = "creds" | "totp" | "enroll" | "codes";

export function AdminLoginForm() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

const input = "mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30";
const button = "mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 py-3 font-semibold text-slate-950 transition hover:bg-teal-400 disabled:opacity-70";

function Inner() {
  const router = useRouter();
  const auth = useAuth();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/admin";
  const next = rawNext.startsWith("/admin") && !rawNext.startsWith("//") ? rawNext : "/admin";

  const [step, setStep] = useState<Step>("creds");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState("");
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") === "forbidden" ? "Your account doesn't have access to the admin panel." : "");

  async function done() {
    await auth.refresh();
    router.replace(next);
    router.refresh();
  }

  async function submitCreds(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await api<{ status: "totp_required" | "enroll_required"; pendingToken: string }>("/api/admin/auth/login", { body: { email, password } });
    if (!res.ok) {
      setBusy(false);
      return setError(res.error);
    }
    setPending(res.data.pendingToken);
    setPassword("");
    if (res.data.status === "enroll_required") {
      const setup = await api<{ secret: string; qr: string }>("/api/admin/auth/totp/setup", { body: { pendingToken: res.data.pendingToken } });
      setBusy(false);
      if (!setup.ok) return setError(setup.error);
      setSecret(setup.data.secret);
      setQr(setup.data.qr);
      setStep("enroll");
    } else {
      setBusy(false);
      setStep("totp");
    }
  }

  async function submitTotp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await api("/api/admin/auth/totp/verify", { body: { pendingToken: pending, ...(useRecovery ? { recoveryCode: code } : { code }) } });
    if (!res.ok) {
      setBusy(false);
      if (res.code === "pending_expired") {
        setStep("creds");
        setCode("");
      }
      return setError(res.error);
    }
    await done();
  }

  async function submitEnroll(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await api<{ recoveryCodes: string[] }>("/api/admin/auth/totp/confirm", { body: { pendingToken: pending, code } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setRecoveryCodes(res.data.recoveryCodes);
    setStep("codes");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo light /></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-300"><ShieldCheck className="h-4 w-4" /> Staff area</p>

          {step === "creds" && (
            <form onSubmit={submitCreds} noValidate>
              <h1 className="mt-4 text-2xl font-bold text-white">Staff sign-in</h1>
              <p className="mt-1 text-sm text-slate-400">Admins, pharmacists and inventory managers only.</p>
              <label htmlFor="a-email" className="mt-6 block text-sm font-medium text-slate-200">Work email</label>
              <input id="a-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
              <label htmlFor="a-pass" className="mt-4 block text-sm font-medium text-slate-200">Password</label>
              <input id="a-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
              <Err>{error}</Err>
              <button type="submit" disabled={busy || !email || !password} className={button}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Continue</button>
            </form>
          )}

          {step === "totp" && (
            <form onSubmit={submitTotp} noValidate>
              <h1 className="mt-4 text-2xl font-bold text-white">Two-factor check</h1>
              <p className="mt-1 text-sm text-slate-400">{useRecovery ? "Enter one of your saved recovery codes." : "Enter the 6-digit code from your authenticator app."}</p>
              <label htmlFor="a-code" className="mt-6 block text-sm font-medium text-slate-200">{useRecovery ? "Recovery code" : "Authentication code"}</label>
              <input
                id="a-code"
                autoFocus
                inputMode={useRecovery ? "text" : "numeric"}
                maxLength={useRecovery ? 16 : 6}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(useRecovery ? e.target.value : e.target.value.replace(/\D/g, ""))}
                className={`${input} text-center font-mono text-xl tracking-widest`}
              />
              <Err>{error}</Err>
              <button type="submit" disabled={busy || !code} className={button}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Verify &amp; sign in</button>
              <button type="button" onClick={() => { setUseRecovery((v) => !v); setCode(""); setError(""); }} className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-slate-400 hover:text-white">
                <KeyRound className="h-4 w-4" /> {useRecovery ? "Use authenticator code instead" : "Use a recovery code"}
              </button>
            </form>
          )}

          {step === "enroll" && (
            <form onSubmit={submitEnroll} noValidate>
              <h1 className="mt-4 text-2xl font-bold text-white">Set up two-factor authentication</h1>
              <p className="mt-1 text-sm text-slate-400">Required for all staff. Scan this QR code with Google Authenticator, Authy or 1Password, then enter the 6-digit code.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code for your authenticator app" width={220} height={220} className="mx-auto mt-5 rounded-xl bg-white p-2" />
              <p className="mt-3 text-center text-xs text-slate-400">Can&apos;t scan? Enter this key manually:</p>
              <p className="mt-1 break-all text-center font-mono text-sm text-teal-300">{secret}</p>
              <label htmlFor="e-code" className="mt-5 block text-sm font-medium text-slate-200">6-digit code</label>
              <input id="e-code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={`${input} text-center font-mono text-xl tracking-widest`} />
              <Err>{error}</Err>
              <button type="submit" disabled={busy || code.length !== 6} className={button}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Turn on 2FA</button>
            </form>
          )}

          {step === "codes" && (
            <div>
              <h1 className="mt-4 text-2xl font-bold text-white">Save your recovery codes</h1>
              <p className="mt-1 text-sm text-slate-400">If you lose your phone, each of these codes lets you sign in once. They are shown only now, so store them somewhere safe (a password manager).</p>
              <ul className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-800 p-4 font-mono text-sm text-teal-200" data-testid="recovery-codes">
                {recoveryCodes.map((c) => <li key={c}>{c}</li>)}
              </ul>
              <button type="button" onClick={() => navigator.clipboard?.writeText(recoveryCodes.join("\n"))} className="mt-3 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><Copy className="h-4 w-4" /> Copy codes</button>
              <button type="button" onClick={done} className={button}>I&apos;ve saved them, continue</button>
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">All sign-ins are logged.</p>
      </div>
    </main>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {children}
    </p>
  );
}
