"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

/** Show a small confirmation at the bottom of the screen. Usable from any client component. */
export function toast(message: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("mn:toast", { detail: { message } }));
}

type Item = { id: number; message: string; leaving?: boolean };
let nextId = 0;

export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const on = (e: Event) => {
      const message = String((e as CustomEvent).detail?.message ?? "").slice(0, 120);
      if (!message) return;
      const id = ++nextId;
      setItems((t) => [...t.slice(-2), { id, message }]); // at most 3 on screen
      timers.push(setTimeout(() => setItems((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x))), 2100));
      timers.push(setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 2400));
    };
    window.addEventListener("mn:toast", on);
    return () => {
      window.removeEventListener("mn:toast", on);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div key={t.id} className={`mn-toast ${t.leaving ? "mn-toast-leaving" : ""} flex max-w-full items-center gap-2 rounded-xl bg-slate-900/95 px-4 py-2.5 text-sm font-medium text-white shadow-lg`}>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-lime-400" />
          <span className="truncate">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
