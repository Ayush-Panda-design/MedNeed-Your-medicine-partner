"use client";

import { useEffect, useRef } from "react";

/* Three original illustrations (all hand-built SVG, duotone green): a phone uploading a prescription,
   a verified document, and a delivery box. Connected by a line that draws itself as the panel scrolls in. */

function UploadArt() {
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden>
      <rect x="12" y="6" width="24" height="36" rx="4" fill="#0f6b33" />
      <rect x="15" y="10" width="18" height="24" rx="2" fill="#eafbe9" />
      <path d="M24 30V18m0 0-5 5m5-5 5 5" stroke="#1b7f33" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="38" r="2" fill="#bff069" />
      <rect x="28" y="4" width="14" height="18" rx="2" fill="#86bb3a" transform="rotate(8 35 13)" />
      <path d="M31 10h7M31 14h7M31 18h4" stroke="#0b5a2b" strokeWidth="1.4" strokeLinecap="round" transform="rotate(8 35 13)" />
    </svg>
  );
}
function VerifyArt() {
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden>
      <rect x="9" y="7" width="26" height="32" rx="3" fill="#eafbe9" />
      <path d="M14 15h16M14 21h16M14 27h10" stroke="#1b7f33" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="33" cy="33" r="10" fill="#1b7f33" />
      <path d="M28.5 33.2l3 3 5.5-6" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DeliverArt() {
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden>
      <path d="M8 18l16-7 16 7-16 7z" fill="#86bb3a" />
      <path d="M8 18v14l16 7V25z" fill="#0f6b33" />
      <path d="M40 18v14l-16 7V25z" fill="#1b7f33" />
      <path d="M22 21.5h4v3h3v4h-3v3h-4v-3h-3v-4h3z" fill="#fff" />
      <path d="M3 22h6M2 28h5" stroke="#bff069" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const STEPS = [
  { art: UploadArt, t: "Upload", d: "Take a clear photo of your prescription and upload it." },
  { art: VerifyArt, t: "Pharmacist verifies", d: "A registered pharmacist reviews it and confirms your medicines." },
  { art: DeliverArt, t: "Delivered to you", d: "We pack, dispatch and deliver to your doorstep." },
];

/** The three steps, connected by a line that draws itself down as the panel scrolls into view. */
export function HowItWorks() {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      el.classList.add("mn-in");
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        el.classList.add("mn-in");
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <ol ref={ref} className="mn-steps relative space-y-4">
      <span aria-hidden className="mn-howline absolute left-[29px] top-8 bottom-8 w-0.5 bg-line-strong" />
      {STEPS.map((s, i) => (
        <li key={s.t} className="mn-step relative flex gap-4 rounded-2xl border border-line bg-subtle p-4 transition-colors hover:border-line-strong" style={{ ["--mn-sd" as string]: `${i * 160}ms` }}>
          <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-tint ring-1 ring-line dark:bg-[#E6F3EA]">
            <s.art />
          </span>
          <div>
            <p className="font-semibold text-ink">{i + 1}. {s.t}</p>
            <p className="text-sm text-ink-2">{s.d}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
