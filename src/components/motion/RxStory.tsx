"use client";

import { useEffect, useRef } from "react";

/**
 * A tiny looping story beside "Upload prescription": a prescription slides in, a pharmacist's "verified" stamp
 * lands on it, then a delivery scooter rides to the customer's home. Original CSS + SVG, transform/opacity only.
 * Plays only while on screen; with reduced motion it shows the finished scene, still.
 */
export function RxStory() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => el.classList.toggle("rx-play", e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="rx-story" role="img" aria-label="Your prescription is verified by a pharmacist and delivered to your home">
      {/* Prescription */}
      <div className="rx-paper">
        <span className="rx-paper-head">℞</span>
        <span className="rx-line" style={{ width: "78%" }} />
        <span className="rx-line" style={{ width: "62%" }} />
        <span className="rx-line" style={{ width: "70%" }} />
        <span className="rx-line rx-line-sign" />
        <span className="rx-stamp">
          <svg viewBox="0 0 24 24" aria-hidden><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="rx-stamp-ring" />
        </span>
      </div>
      <span className="rx-label rx-label-1">Verified</span>

      {/* Road */}
      <span className="rx-road" aria-hidden />

      {/* Scooter */}
      <div className="rx-lane" aria-hidden>
        <div className="rx-run">
          <svg viewBox="0 0 64 40" className="rx-scooter">
            <rect x="6" y="6" width="20" height="16" rx="3" fill="#86bb3a" />
            <path d="M14 10h4v3h3v4h-3v3h-4v-3h-3v-4h3z" fill="#fff" />
            <path d="M8 26h30l6-12h6" fill="none" stroke="#0f6b33" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M28 26c2-6 8-8 14-6" fill="none" stroke="#1b7f33" strokeWidth="5" strokeLinecap="round" />
            <circle cx="49" cy="12" r="3.5" fill="#0f6b33" />
            <g className="rx-wheel" style={{ transformOrigin: "14px 31px" }}><circle cx="14" cy="31" r="6" fill="#1f2a44" /><path d="M10 31h8M14 27v8" stroke="#94a3b8" strokeWidth="1.5" /></g>
            <g className="rx-wheel" style={{ transformOrigin: "48px 31px" }}><circle cx="48" cy="31" r="6" fill="#1f2a44" /><path d="M44 31h8M48 27v8" stroke="#94a3b8" strokeWidth="1.5" /></g>
          </svg>
          <span className="rx-dust" />
        </div>
      </div>

      {/* Home */}
      <div className="rx-home" aria-hidden>
        <svg viewBox="0 0 48 44">
          <path d="M4 22L24 5l20 17" fill="none" stroke="#0f6b33" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 19v21h30V19" fill="#eafbe9" stroke="#0f6b33" strokeWidth="3" strokeLinejoin="round" />
          <rect className="rx-door" x="20" y="27" width="8" height="13" rx="1.5" fill="#1b7f33" />
        </svg>
      </div>
      <span className="rx-label rx-label-2">Delivered</span>
    </div>
  );
}
