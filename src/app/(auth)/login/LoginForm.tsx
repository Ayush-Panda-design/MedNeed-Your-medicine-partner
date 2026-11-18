"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, ChevronDown, Eye, EyeOff, Headphones, Loader2, Lock, Mail, Pill, ShieldCheck, Smartphone, Truck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/api";
import { heroSerif } from "@/lib/fonts";
import { useAuth } from "@/lib/providers";
import { useTurnstile } from "@/components/auth/Turnstile";
import "@/components/auth/auth.css";

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

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function LoginInner({ googleEnabled, smsEnabled, captchaSiteKey }: { googleEnabled: boolean; smsEnabled: boolean; captchaSiteKey: string | null }) {
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const [tab, setTab] = useState<"phone" | "email">(smsEnabled ? "phone" : "email");
  const urlError = ERRORS[params.get("error") ?? ""] ?? "";

  return (
    <main className={`au ${heroSerif.variable}`}>
      <div className="au-bg" aria-hidden />
      <Image src="/auth/leaves-tr-v2.webp" alt="" width={381} height={266} priority className="au-leaf-tr" />
      <Image src="/auth/leaves-bl.webp" alt="" width={280} height={288} className="au-leaf-bl" />

      {/* Desktop: the story panel */}
      <aside className="au-story">
        <Logo size="lg" />
        <h1 className="au-story-title">
          Healthcare essentials,
          <br />
          <em className="au-em">
            one tap away.
            <svg className="au-swash" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden focusable="false"><path d="M3 10.5C38 4 86 2.5 128 5.5c26 1.9 48 4.6 68-1.5" /></svg>
          </em>
        </h1>
        <ul className="au-feats">
          <li><span className="au-ico"><ShieldCheck aria-hidden /></span><span>Genuine medicines<br />from licensed sources</span></li>
          <li><span className="au-ico"><Pill aria-hidden /></span><span>Prescriptions verified<br />by pharmacists</span></li>
          <li><span className="au-ico"><Truck aria-hidden /></span><span>Reliable doorstep delivery</span></li>
          <li><span className="au-ico"><Headphones aria-hidden /></span><span>Easy reordering of your<br />regular medicines</span></li>
        </ul>
        <Image src="/auth/kit-v2.webp" alt="" width={720} height={510} priority className="au-kit" />
        <p className="au-tagline">
          <svg viewBox="0 0 56 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M0 12h16l3-6 5 14 4-10 3 2h6" /></svg>
          Your health our priority <i aria-hidden />
        </p>
      </aside>

      {/* Phones: logo, title and product art above the card */}
      <header className="au-mhead">
        <div className="au-logo"><Logo size="md" /></div>
        <h1 className="au-title">Sign in or create <em>account</em></h1>
        <p className="au-sub">Choose how you&apos;d like to continue.</p>
        <Image src="/auth/jar.webp" alt="" width={566} height={544} priority className="au-mart" />
      </header>

      <section className="au-panel">
        <div className="au-card">
          <h2 className="au-card-title">Sign in or create account</h2>
          <p className="au-card-sub">Choose how you&apos;d like to continue.</p>
          <span className="au-card-rule" aria-hidden />

          {urlError && (
            <p role="alert" className="au-alert">
              <AlertCircle /> {urlError}
            </p>
          )}

          {smsEnabled && (
            <div role="tablist" aria-label="Sign-in method" className="au-tabs">
              {([["phone", "Mobile OTP", Smartphone], ["email", "Email", Mail]] as const).map(([key, label, Icon]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className="au-tab">
                  <Icon className="h-4 w-4" aria-hidden /> {label}
                </button>
              ))}
            </div>
          )}

          <div>{smsEnabled && tab === "phone" ? <PhoneFlow next={next} captchaSiteKey={captchaSiteKey} /> : <EmailFlow next={next} />}</div>

          <div className="au-or">OR</div>

          {googleEnabled ? (
            <a href={`/api/auth/google?next=${encodeURIComponent(next)}`} className="au-google">
              <GoogleMark /> Continue with Google
            </a>
          ) : (
            <p className="au-note">
              Google sign-in activates once <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> are set.
            </p>
          )}

          <p className="au-legal">
            By continuing you agree to our <Link href="/terms">Terms of Use</Link> and <Link href="/privacy">Privacy Policy</Link>.
          </p>
          <Link href="/" className="au-browse">Continue browsing without signing in</Link>
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
  return <p id={id} role="alert" className="au-err">{children}</p>;
}

function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={busy} className="au-btn">
      {busy ? <Loader2 className="animate-spin" /> : null} {children} {!busy && <ArrowRight aria-hidden />}
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
      <label htmlFor="phone" className="au-label">Mobile number</label>
      <div className={`au-group ${error ? "is-error" : ""}`}>
        <span className="au-cc">+91 <ChevronDown aria-hidden /></span>
        <input
          id="phone"
          className="au-field"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          value={phone}
          onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
          placeholder="10-digit mobile number"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "phone-error" : undefined}
        />
      </div>
      <ErrorText id="phone-error">{error}</ErrorText>
      <Submit busy={busy}>Get OTP</Submit>
    </form>
  ) : (
    <form onSubmit={verify} noValidate>
      <button type="button" onClick={() => { setStep("phone"); setError(""); }} className="au-back">
        <ArrowLeft aria-hidden /> Change number
      </button>
      <p style={{ margin: 0, color: "var(--au-muted)" }}>Enter the 6-digit code sent to <strong style={{ color: "var(--au-ink)" }}>+91 {phone}</strong></p>
      <div className="au-otp" role="group" aria-label="One-time password">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${i + 1}`}
            maxLength={OTP_LEN}
            className={error ? "is-error" : ""}
            onChange={(e) => { setDigit(i, e.target.value); setError(""); }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowRight" && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
            }}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>
      <ErrorText>{error}</ErrorText>
      <Submit busy={busy}>Verify &amp; continue</Submit>
      <p className="au-switch">
        {seconds > 0 ? (
          <>Resend code in <strong>{seconds}s</strong></>
        ) : (
          <button type="button" onClick={() => sendOtp()}>Resend code</button>
        )}
      </p>
      {devOtp && (
        <p className="au-devnote">
          Development mode: no SMS is sent. Your code is <strong style={{ fontFamily: "monospace", fontSize: "0.95rem" }} data-testid="dev-otp">{devOtp}</strong>
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

  return (
    <form onSubmit={submit} noValidate>
      {mode === "signup" && (
        <div style={{ marginBottom: "1.25rem" }}>
          <label htmlFor="name" className="au-label">Full name</label>
          <input id="name" className="au-field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      )}
      <div>
        <label htmlFor="email" className="au-label"><Mail aria-hidden /> Email</label>
        <input id="email" type="email" className="au-field" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div className="au-field-gap">
        <div className="au-row">
          <label htmlFor="password" className="au-label"><Lock aria-hidden /> Password</label>
          {mode === "signin" && (
            <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="au-link">
              Forgot password?
            </Link>
          )}
        </div>
        <div className="au-pw">
          <input
            id="password"
            type={show ? "text" : "password"}
            className="au-field"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="au-eye">
            {show ? <EyeOff /> : <Eye />}
          </button>
        </div>
        {mode === "signup" && <p className="au-hint">At least 8 characters. Avoid common passwords.</p>}
      </div>
      <ErrorText>{error}</ErrorText>
      <Submit busy={busy}>{mode === "signin" ? "Sign in" : "Create account"}</Submit>
      <p className="au-switch">
        {mode === "signin" ? "New to MedNeed?" : "Already have an account?"}{" "}
        <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}>
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </form>
  );
}
