"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Loader2, MapPin, X } from "lucide-react";

const KEY = "medneed_pincode_v1"; // shared with the header's "Deliver to" control
type Result = { pincode: string; served: boolean; area?: string | null; message: string; unknown?: boolean };

/** Shortcuts shown under the hero buttons: a delivery check right where people land, and the common health concerns. */
const SHORTCUTS = [
  { label: "Fever & pain", q: "paracetamol" },
  { label: "Diabetes", q: "diabetes" },
  { label: "Heart & BP", q: "blood pressure" },
  { label: "Baby care", q: "baby" },
  { label: "Vitamins", q: "vitamin" },
  { label: "Cold & flu", q: "cold" },
];

export function HeroQuick() {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as Result | null;
      if (v?.pincode) {
        setPin(v.pincode);
        setRes(v);
      }
    } catch {}
  }, []);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setRes(null);
    if (!/^[1-9]\d{5}$/.test(pin)) return setErr("Enter a valid 6-digit pincode.");
    setBusy(true);
    try {
      const r = await fetch(`/api/delivery/check?pincode=${pin}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? "Could not check right now.");
      setRes(data);
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
    } catch (e2) {
      setErr((e2 as Error).message || "Could not check right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hq">
      <form onSubmit={check} className="hq-form" aria-label="Check delivery to your pincode">
        <MapPin className="h-4 w-4 shrink-0 text-lime-300" aria-hidden />
        <input
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setErr(""); }}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="Pincode: check delivery"
          aria-label="Your pincode"
          className="hq-input"
        />
        <button type="submit" disabled={busy} className="hq-btn">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}</button>
      </form>
      <p className="hq-msg" role="status" aria-live="polite">
        {err ? <span className="hq-bad"><X className="h-3.5 w-3.5" /> {err}</span>
          : res ? <span className={res.served ? "hq-good" : "hq-bad"}>{res.served ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} {res.message}</span>
          : null}
      </p>
      <ul className="hq-chips" aria-label="Shop by health concern">
        {SHORTCUTS.map((s) => (
          <li key={s.label}><Link href={`/medicines?q=${encodeURIComponent(s.q)}`} className="hq-chip">{s.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
