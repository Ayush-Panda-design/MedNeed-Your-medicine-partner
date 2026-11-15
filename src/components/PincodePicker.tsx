"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, MapPin, X } from "lucide-react";

const KEY = "medneed_pincode_v1";
type Result = { pincode: string; served: boolean; area?: string | null; message: string; unknown?: boolean };

/** "Deliver to" control: the visitor enters a pincode and is told straight away whether we deliver there. */
export function PincodePicker({ overlay }: { overlay: boolean }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<Result | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as Result | null;
      if (v?.pincode) setSaved(v);
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!/^[1-9]\d{5}$/.test(pin)) return setError("Enter a valid 6-digit pincode.");
    setBusy(true);
    try {
      const res = await fetch(`/api/delivery/check?pincode=${pin}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not check right now.");
      setResult(data);
      setSaved(data);
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
    } catch (err) {
      setError((err as Error).message || "Could not check right now.");
    } finally {
      setBusy(false);
    }
  };

  const label = saved ? `${saved.area ? `${saved.area} ` : ""}${saved.pincode}` : "Select pincode";
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setPin(saved?.pincode ?? ""); setResult(null); setError(""); }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${overlay ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-100"}`}
      >
        <MapPin className={`h-4 w-4 ${overlay ? "text-lime-300" : "text-teal-600"}`} aria-hidden />
        <span className={overlay ? "text-white/75" : "text-slate-500"}>Deliver to</span>
        <span className="max-w-[11rem] truncate font-semibold">{label}</span>
        {saved && !saved.unknown && (saved.served ? <Check className="h-3.5 w-3.5 text-emerald-500" aria-label="We deliver here" /> : <X className="h-3.5 w-3.5 text-amber-500" aria-label="Outside delivery area" />)}
        <ChevronDown className={`h-3.5 w-3.5 ${overlay ? "text-white/70" : "text-slate-400"}`} aria-hidden />
      </button>
      {open && (
        <div role="dialog" aria-label="Check delivery to your pincode" className="absolute left-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl [text-shadow:none]">
          <p className="text-sm font-semibold">Check delivery to your area</p>
          <p className="mt-0.5 text-xs text-slate-500">Home delivery across Bhubaneswar.</p>
          <form onSubmit={check} className="mt-3 flex gap-2">
            <input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit pincode"
              aria-label="Pincode"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
            <button disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Check
            </button>
          </form>
          {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
          {result && (
            <p role="status" className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${result.served ? "bg-emerald-50 text-emerald-800" : result.unknown ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-900"}`}>
              {result.served ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : result.unknown ? <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
              <span>{result.message}</span>
            </p>
          )}
          <p className="mt-3 text-[11px] text-slate-400">The exact delivery fee is shown at checkout with your full address.</p>
        </div>
      )}
    </div>
  );
}
