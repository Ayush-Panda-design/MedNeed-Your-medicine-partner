"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, BadgeCheck, Eye, EyeOff, Loader2, Mail, PackageCheck, Smartphone, ShieldCheck, Truck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/providers";
import { useTurnstile } from "@/components/auth/Turnstile";

const OTP_LEN = 6;
const RESEND_SECONDS = 30;

const ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in isn't set up on this site yet.",
  google_denied: "Google sign-in was cancelled.",
  google_failed: "We couldn't sign you in with Google. Please try again.",
  account_disabled: "This account has been disabled. Contact support.",
};

export function LoginForm({ googleEnabled, smsEnabled = true, captchaSiteKey = null }: { googleEnabled: boolean; smsEnabled?: boolean; captchaSiteKey?: string | null }) {
  return (
    <Suspense>
      <LoginInner googleEnabled={googleEnabled} smsEnabled={smsEnabled} captchaSiteKey={captchaSiteKey} />
    </Suspense>
  );
}

function LoginInner({ googleEnabled, smsEnabled, captchaSiteKey }: { googleEnabled: boolean; smsEnabled: boolean; captchaSiteKey: string | null }) {
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const [tab, setTab] = useState<"phone" | "email">(smsEnabled ? "phone" : "email");
  const urlError = ERRORS[params.get("error") ?? ""] ?? "";

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <Logo light tagline size="lg" />
        <div className="relative">
          <h1 className="text-4xl font-extrabold leading-tight">
            Healthcare essentials,
            <br />
            one tap away.
          </h1>
          <ul className="mt-8 space-y-4 text-teal-50">
            <li className="flex items-center gap-3"><BadgeCheck className="h-5 w-5" /> Genuine medicines from licensed sources</li>
            <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5" /> Prescriptions verified by pharmacists</li>
            <li className="flex items-center gap-3"><Truck className="h-5 w-5" /> Reliable doorstep delivery</li>
            <li className="flex items-center gap-3"><PackageCheck className="h-5 w-5" /> Easy reordering of your regular medicines</li>
          </ul>
        </div>
        <p className="relative text-xs text-teal-100">Your health information stays private and is never shared without your consent.</p>
      </aside>

      <section className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="text-3xl font-bold">Sign in or create account</h2>
          <p className="mt-2 text-slate-600">Choose how you&apos;d like to continue.</p>

          {urlError && (
            <p role="alert" className="mt-5 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {urlError}
            </p>
          )}

          {smsEnabled && <div role="tablist" aria-label="Sign-in method" className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
            {([["phone", "Mobile OTP", Smartphone], ["email", "Email", Mail]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 transition ${tab === key ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>}

          <div className="mt-6">{smsEnabled && tab === "phone" ? <PhoneFlow next={next} captchaSiteKey={captchaSiteKey} /> : <EmailFlow next={next} />}</div>

          <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> OR <span className="h-px flex-1 bg-slate-200" />
          </div>

          {googleEnabled ? (
            <a
              href={`/api/auth/google?next=${encodeURIComponent(next)}`}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white py-3 font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Continue with Google
            </a>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">
              Google sign-in activates once <code className="rounded bg-slate-100 px-1">GOOGLE_CLIENT_ID</code> and <code className="rounded bg-slate-100 px-1">GOOGLE_CLIENT_SECRET</code> are set.
            </p>
          )}

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">By continuing you agree to our <Link href="/terms" className="underline hover:text-slate-700">Terms of Use</Link> and <Link href="/privacy" className="underline hover:text-slate-700">Privacy Policy</Link>.</p>
          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/" className="font-medium text-teal-700 hover:underline">Continue browsing without signing in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function useFinish(next: string) {
  const router = useRouter();
  const auth = useAuth();
  return async (isNew = false) => {
    const me = await auth.refresh();
    // Delivery people land on their own screen unless they were sent somewhere specific.
    router.replace(me?.isDelivery && next === "/" ? "/delivery" : isNew && next === "/" ? "/account?welcome=1" : next);
    router.refresh();
  };
}

function ErrorText({ id, children }: { id?: string; children: React.ReactNode }) {
  if (!children) return null;
  return <p id={id} role="alert" className="mt-2 text-sm text-rose-600">{children}</p>;
}

function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 font-semibold text-white transition hover:bg-teal-700 disabled:opacity-70">
      {busy && <Loader2 className="h-4 w-4 animate-spin" />} {children}
    </button>
  );
}

/* ---------------- Mobile OTP ---------------- */

function PhoneFlow({ next, captchaSiteKey }: { next: string; captchaSiteKey: string | null }) {
  const finish = useFinish(next);
  const captcha = useTurnstile(captchaSiteKey);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(OTP_LEN).fill(""));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter a valid 10-digit mobile number.");
    setError("");
    setBusy(true);
    if (captcha.enabled && !captcha.token) {
      setBusy(false);
      return setError("Please wait a moment for the security check, then try again.");
    }
    const res = await api<{ devOtp?: string }>("/api/auth/otp/send", { body: { phone, purpose: "login", ...(captcha.enabled ? { captcha: captcha.token } : {}) } });
    captcha.reset();
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setDevOtp(res.data.devOtp);
    setDigits(Array(OTP_LEN).fill(""));
    setStep("otp");
    setSeconds(RESEND_SECONDS);
    setTimeout(() => refs.current[0]?.focus(), 50);
  }

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    const code = digits.join("");
    if (code.length < OTP_LEN) return setError("Enter the 6-digit code.");
    setError("");
    setBusy(true);
    const res = await api<{ isNew: boolean }>("/api/auth/otp/verify", { body: { phone, code, purpose: "login" } });
    if (!res.ok) {
      setBusy(false);
      return setError(res.error);
    }
    await finish(res.data.isNew);
  }

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, "");
    if (!clean) return setDigits((d) => d.map((x, idx) => (idx === i ? "" : x)));
    setDigits((d) => {
      const nextDigits = [...d];
      clean.split("").forEach((ch, k) => {
        if (i + k < OTP_LEN) nextDigits[i + k] = ch;
      });
      return nextDigits;
    });
    refs.current[Math.min(i + clean.length, OTP_LEN - 1)]?.focus();
  }

  // The bot-check widget sits outside both steps so it stays mounted for "Resend code".
  const body = step === "phone" ? (
      <form onSubmit={sendOtp} noValidate>
        <label htmlFor="phone" className="block text-sm font-medium">Mobile number</label>
        <div className={`mt-2 flex items-center rounded-xl border bg-white focus-within:ring-2 ${error ? "border-rose-500 focus-within:ring-rose-100" : "border-slate-300 focus-within:border-teal-600 focus-within:ring-teal-100"}`}>
          <span className="border-r border-slate-200 px-4 text-sm font-medium text-slate-600">+91</span>
          <input
            id="phone"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            value={phone}
            onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
            placeholder="10-digit mobile number"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "phone-error" : undefined}
            className="w-full rounded-r-xl bg-transparent px-4 py-3.5 text-base outline-none"
          />
        </div>
        <ErrorText id="phone-error">{error}</ErrorText>
        <Submit busy={busy}>Get OTP</Submit>
      </form>
  ) : (
    <form onSubmit={verify} noValidate>
      <button type="button" onClick={() => { setStep("phone"); setError(""); }} className="mb-4 flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Change number
      </button>
      <p className="text-slate-600">Enter the 6-digit code sent to <span className="font-semibold text-slate-900">+91 {phone}</span></p>
      <div className="mt-5 flex gap-2 sm:gap-3" role="group" aria-label="One-time password">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${i + 1}`}
            maxLength={OTP_LEN}
            onChange={(e) => { setDigit(i, e.target.value); setError(""); }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowRight" && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
            }}
            onFocus={(e) => e.target.select()}
            className={`h-14 w-full min-w-0 rounded-xl border bg-white text-center text-xl font-semibold outline-none focus:ring-2 ${error ? "border-rose-500 focus:ring-rose-100" : "border-slate-300 focus:border-teal-600 focus:ring-teal-100"}`}
          />
        ))}
      </div>
      <ErrorText>{error}</ErrorText>
      <Submit busy={busy}>Verify &amp; continue</Submit>
      <p className="mt-4 text-center text-sm text-slate-600">
        {seconds > 0 ? (
          <>Resend code in <span className="font-semibold">{seconds}s</span></>
        ) : (
          <button type="button" onClick={() => sendOtp()} className="font-semibold text-teal-700 hover:underline">Resend code</button>
        )}
      </p>
      {devOtp && (
        <p className="mt-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          Development mode: no SMS is sent. Your code is <span className="font-mono text-sm font-bold" data-testid="dev-otp">{devOtp}</span>
        </p>
      )}
    </form>
  );

  return (
    <>
      {body}
      {captcha.widget}
    </>
  );
}

/* ---------------- Email + password ---------------- */

function EmailFlow({ next }: { next: string }) {
  const finish = useFinish(next);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "signup" && name.trim().length < 2) return setError("Enter your name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    setBusy(true);
    const res = await api(mode === "signin" ? "/api/auth/login" : "/api/auth/register", {
      body: mode === "signin" ? { email, password } : { name, email, password },
    });
    if (!res.ok) {
      setBusy(false);
      return setError(res.error);
    }
    await finish(false);
  }

  const field = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

  return (
    <form onSubmit={submit} noValidate>
      {mode === "signup" && (
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium">Full name</label>
          <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
      )}
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium">Email</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="you@example.com" />
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          {mode === "signin" && (
            <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-sm font-medium text-teal-700 hover:underline">
              Forgot password?
            </Link>
          )}
        </div>
        <div className="relative">
          <input
            id="password"
            type={show ? "text" : "password"}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${field} pr-12`}
          />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-slate-400 hover:text-slate-700">
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {mode === "signup" && <p className="mt-1 text-xs text-slate-500">At least 8 characters. Avoid common passwords.</p>}
      </div>
      <ErrorText>{error}</ErrorText>
      <Submit busy={busy}>{mode === "signin" ? "Sign in" : "Create account"}</Submit>
      <p className="mt-4 text-center text-sm text-slate-600">
        {mode === "signin" ? "New to MedNeed?" : "Already have an account?"}{" "}
        <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }} className="font-semibold text-teal-700 hover:underline">
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </form>
  );
}
