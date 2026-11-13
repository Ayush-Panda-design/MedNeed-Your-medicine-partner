"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

/** Accordion FAQ with a smooth open/close (grid-rows transition) and one item open by default. */
export function FaqList({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div data-reveal className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} className={`relative transition-colors ${isOpen ? "bg-teal-50/40" : ""}`}>
            {isOpen && <span aria-hidden className="absolute inset-y-0 left-0 w-1 rounded-r bg-gradient-to-b from-teal-600 to-lime-400" />}
            <button
              data-fx="pop"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 p-5 text-left font-semibold transition-colors hover:bg-teal-50/60"
            >
              <span className={isOpen ? "text-teal-800" : "text-slate-900"}>{f.q}</span>
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all duration-300 ${isOpen ? "rotate-90 bg-teal-600 text-white" : "bg-teal-50 text-teal-700"}`}>
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
            <div className={`mn-acc-panel px-5 ${isOpen ? "mn-acc-open" : ""}`}>
              <div className="mn-acc-inner">
                <p className="pb-5 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
