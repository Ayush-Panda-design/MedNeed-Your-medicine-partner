"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/providers";

type PublicUser = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  hasPassword: boolean;
};

const input = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50 disabled:text-slate-500";
const card = "rounded-2xl border border-slate-200 bg-white p-6";
const primary = "inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-70";

function Notice({ kind, children }: { kind: "ok" | "error"; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`mt-4 rounded-lg p-3 text-sm ${kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
      {children}
    </p>
  );
}

export function ProfilePanels({ user, welcome }: { user: PublicUser; welcome: boolean }) {
  return (
    <div className="space-y-6">
      {welcome && (
        <p className="flex items-center gap-2 rounded-2xl bg-teal-50 p-4 text-sm text-teal-900">
          <CheckCircle2 className="h-5 w-5" /> Welcome to MedNeed! Add your name so we can address your orders properly.
        </p>
      )}
      <ProfileForm user={user} />
      <PhoneCard user={user} />
      <PasswordForm user={user} />
      <SessionsCard />
    </div>
  );
}

function ProfileForm({ user }: { user: PublicUser }) {
  const router = useRouter();
  const auth = useAuth();
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const body: Record<string, string> = {};
    if (name.trim() && name.trim() !== (user.name ?? "")) body.name = name.trim();
    if (!user.email && email.trim()) body.email = email.trim();
    if (!Object.keys(body).length) {
      setBusy(false);
      return setMsg({ kind: "error", text: "Nothing to save." });
    }
    const res = await api("/api/account/profile", { method: "PATCH", body });
    setBusy(false);
    if (!res.ok) return setMsg({ kind: "error", text: res.error });
    setMsg({ kind: "ok", text: "Profile saved." });
    await auth.refresh();
    router.refresh();
  }

  return (
    <form onSubmit={save} className={card} noValidate>
      <h2 className="text-lg font-bold">Profile</h2>
      <label htmlFor="p-name" className="mt-4 block text-sm font-medium">Full name</label>
      <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={input} />
      <label htmlFor="p-email" className="mt-4 block text-sm font-medium">
        Email {user.email && (user.emailVerified ? <span className="ml-1 inline-flex items-center gap-1 text-xs font-normal text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> verified</span> : <span className="ml-1 text-xs font-normal text-amber-700">not verified yet</span>)}
      </label>
      <input id="p-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={Boolean(user.email)} placeholder="you@example.com" autoComplete="email" className={input} />
      {user.email && !user.emailVerified && <VerifyEmailLink />}
      {user.email && <p className="mt-1 text-xs text-slate-500">To change your email address, contact support.</p>}
      <div className="mt-5"><button type="submit" disabled={busy} className={primary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save changes</button></div>
      <Notice kind={msg?.kind ?? "ok"}>{msg?.text}</Notice>
    </form>
  );
}

function PhoneCard({ user }: { user: PublicUser }) {
  const router = useRouter();
  const auth = useAuth();
  const [step, setStep] = useState<"idle" | "phone" | "otp">("idle");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api<{ devOtp?: string }>("/api/auth/otp/send", { body: { phone, purpose: "link" } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setDevOtp(res.data.devOtp);
    setStep("otp");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api("/api/auth/otp/verify", { body: { phone, code, purpose: "link" } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setStep("idle");
    await auth.refresh();
    router.refresh();
  }

  return (
    <div className={card}>
      <h2 className="text-lg font-bold">Mobile number</h2>
      {user.phone ? (
        <p className="mt-3 flex items-center gap-2 text-sm">
          {user.phone} <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> verified</span>
        </p>
      ) : step === "idle" ? (
        <>
          <p className="mt-3 text-sm text-slate-600">Add a mobile number for delivery updates and quick OTP sign-in.</p>
          <button onClick={() => setStep("phone")} className={`${primary} mt-4`}>Add mobile number</button>
        </>
      ) : step === "phone" ? (
        <form onSubmit={send} noValidate>
          <label htmlFor="link-phone" className="mt-3 block text-sm font-medium">Mobile number</label>
          <input id="link-phone" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} className={input} placeholder="10-digit number" />
          <button type="submit" disabled={busy} className={`${primary} mt-4`}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Send OTP</button>
        </form>
      ) : (
        <form onSubmit={verify} noValidate>
          <label htmlFor="link-code" className="mt-3 block text-sm font-medium">Enter the 6-digit code sent to {phone}</label>
          <input id="link-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={input} autoComplete="one-time-code" />
          <button type="submit" disabled={busy} className={`${primary} mt-4`}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Verify</button>
          {devOtp && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Development mode: your code is <span className="font-mono font-bold">{devOtp}</span></p>}
        </form>
      )}
      <Notice kind="error">{error}</Notice>
    </div>
  );
}

function PasswordForm({ user }: { user: PublicUser }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  if (!user.email) {
    return (
      <div className={card}>
        <h2 className="text-lg font-bold">Password</h2>
        <p className="mt-3 text-sm text-slate-600">Add an email address above if you want to sign in with a password as well.</p>
      </div>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await api("/api/account/password", { body: { currentPassword: current || undefined, newPassword: next } });
    setBusy(false);
    if (!res.ok) return setMsg({ kind: "error", text: res.error });
    setCurrent("");
    setNext("");
    setMsg({ kind: "ok", text: user.hasPassword ? "Password changed. Other devices were signed out." : "Password set. You can now sign in with your email and password." });
  }

  return (
    <form onSubmit={save} className={card} noValidate>
      <h2 className="text-lg font-bold">{user.hasPassword ? "Change password" : "Set a password"}</h2>
      {user.hasPassword && (
        <>
          <label htmlFor="cur-pw" className="mt-4 block text-sm font-medium">Current password</label>
          <input id="cur-pw" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />
        </>
      )}
      <label htmlFor="new-pw" className="mt-4 block text-sm font-medium">New password</label>
      <input id="new-pw" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={input} />
      <p className="mt-1 text-xs text-slate-500">At least 8 characters. Avoid common passwords.</p>
      <div className="mt-5"><button type="submit" disabled={busy || !next} className={primary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {user.hasPassword ? "Change password" : "Set password"}</button></div>
      <Notice kind={msg?.kind ?? "ok"}>{msg?.text}</Notice>
    </form>
  );
}

function SessionsCard() {
  const router = useRouter();
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <div className={card}>
      <h2 className="text-lg font-bold">Sign out</h2>
      <p className="mt-3 text-sm text-slate-600">Signed in on a shared or lost device? Sign out everywhere, including this browser.</p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await api("/api/auth/logout", { body: { all: true } });
          await auth.refresh();
          router.push("/login");
          router.refresh();
        }}
        className="mt-4 rounded-xl border border-rose-300 px-5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-70"
      >
        Sign out of all devices
      </button>
    </div>
  );
}

/** Sends the confirmation link for an unverified email. */
function VerifyEmailLink() {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [text, setText] = useState("");
  const [devLink, setDevLink] = useState("");
  async function send() {
    setState("busy");
    const res = await api<{ sent?: boolean; alreadyVerified?: boolean; devLink?: string }>("/api/auth/email/verify", { body: {} });
    if (!res.ok) {
      setState("error");
      return setText(res.error);
    }
    setDevLink(res.data.devLink ?? "");
    setState("sent");
    setText(res.data.alreadyVerified ? "Your email is already confirmed. Refresh the page." : "Confirmation link sent. Check your inbox (and spam).");
  }
  return (
    <div className="mt-2 text-sm" aria-live="polite">
      {state === "sent" || state === "error" ? (
        <p className={state === "error" ? "text-rose-700" : "text-emerald-700"}>
          {text}
          {devLink && <> <a href={devLink} className="font-semibold underline" data-testid="dev-verify-link">Open it (development)</a></>}
        </p>
      ) : (
        <button type="button" onClick={send} disabled={state === "busy"} className="font-semibold text-teal-700 hover:underline disabled:opacity-60">
          {state === "busy" ? "Sending…" : "Send confirmation link"}
        </button>
      )}
    </div>
  );
}
