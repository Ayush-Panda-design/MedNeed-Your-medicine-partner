"use client";

import { useEffect, useRef } from "react";

/**
 * Interactive hero illustration: an original medicine-bottle scene with floating pills, a leaf and a
 * medical cross arranged in depth layers. The layers parallax toward the cursor and the whole scene
 * zooms gently as the page scrolls. Purely decorative (aria-hidden); all motion is disabled for
 * users who prefer reduced motion.
 */
export function HeroArt() {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let mx = 0, my = 0, targetX = 0, targetY = 0, raf = 0;

    const loop = () => {
      cancelAnimationFrame(raf);
      const step = () => {
        mx += (targetX - mx) * 0.08;
        my += (targetY - my) * 0.08;
        el.style.setProperty("--mx", mx.toFixed(3));
        el.style.setProperty("--my", my.toFixed(3));
        if (Math.abs(targetX - mx) > 0.002 || Math.abs(targetY - my) > 0.002) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      targetX = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      targetY = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      loop();
    };
    const onLeave = () => { targetX = 0; targetY = 0; loop(); };
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height))); // 0 at top, 1 scrolled past
      el.style.setProperty("--sz", (1 + p * 0.18).toFixed(3));
      el.style.setProperty("--sty", `${(-p * 26).toFixed(1)}px`);
      el.style.setProperty("--sop", (1 - p * 0.5).toFixed(2));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // depth = how far a layer shifts with the cursor (px per unit of --mx/--my)
  const layer = (dx: number, dy: number): React.CSSProperties => ({
    transform: `translate3d(calc(var(--mx,0) * ${dx}px), calc(var(--my,0) * ${dy}px), 0)`,
  });

  return (
    <div aria-hidden ref={wrap} className="mn-heroart relative mx-auto aspect-square w-full max-w-[460px]">
      {/* glow + podium */}
      <div className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-300/25 blur-3xl" />
      <div className="mn-ringpulse absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
      <svg className="mn-spin-slow absolute left-1/2 top-1/2 h-[82%] w-[82%] -translate-x-1/2 -translate-y-1/2 text-white/15" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1" strokeDasharray="4 10" />
      </svg>

      {/* central bottle — tilts toward the cursor */}
      <div className="absolute inset-0 grid place-items-center" style={{ transform: "perspective(800px) rotateY(calc(var(--mx,0) * 9deg)) rotateX(calc(var(--my,0) * -9deg))", transformStyle: "preserve-3d" }}>
        <svg className="h-[62%] w-auto drop-shadow-2xl" viewBox="0 0 180 240">
          <ellipse cx="90" cy="226" rx="54" ry="10" fill="#063d1b" opacity="0.35" />
          <rect x="62" y="10" width="56" height="26" rx="8" fill="#0b5a2b" />
          <rect x="68" y="34" width="44" height="14" fill="#0f6b33" />
          <rect x="52" y="46" width="76" height="170" rx="24" fill="#ffffff" />
          <rect x="52" y="46" width="22" height="170" rx="24" fill="#eef5ee" />
          <rect x="52" y="96" width="76" height="80" rx="4" fill="#1b7f33" />
          <path d="M84 110h12v10h10v12h-10v10H84v-10H74v-12h10z" fill="#ffffff" />
          <rect x="66" y="150" width="48" height="5" rx="2.5" fill="#ffffff" opacity="0.7" />
          <rect x="66" y="161" width="34" height="5" rx="2.5" fill="#ffffff" opacity="0.5" />
          <rect x="58" y="54" width="9" height="150" rx="4.5" fill="#ffffff" opacity="0.6" />
        </svg>
      </div>

      {/* floating front layers (move most with the cursor) */}
      <div className="absolute left-[4%] top-[8%]" style={layer(26, 20)}>
        <svg className="mn-f-a h-16 w-16 drop-shadow-lg" viewBox="0 0 48 48"><g transform="rotate(32 24 24)"><rect x="8" y="17" width="32" height="14" rx="7" fill="#fff" /><path d="M24 17h9a7 7 0 0 1 0 14h-9z" fill="#bff069" /></g></svg>
      </div>
      <div className="absolute right-[2%] top-[20%]" style={layer(-30, 16)}>
        <svg className="mn-f-c h-12 w-12 drop-shadow-lg" viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="#fff" /><path d="M9 22h26" stroke="#86bb3a" strokeWidth="2.5" strokeLinecap="round" /></svg>
      </div>
      <div className="absolute left-[0%] bottom-[14%]" style={layer(22, -18)}>
        <svg className="mn-f-b h-14 w-14 drop-shadow" viewBox="0 0 48 48"><path d="M40 8C20 10 10 22 10 38c16 0 30-10 30-30Z" fill="#a7e26a" /><path d="M34 14C24 20 16 28 13 37" stroke="#1b7f33" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
      </div>
      <div className="absolute right-[6%] bottom-[10%]" style={layer(-24, -22)}>
        <svg className="mn-f-c h-14 w-14 drop-shadow-lg" viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="12" fill="#fff" /><path d="M20 13h8v7h7v8h-7v7h-8v-7h-7v-8h7z" fill="#1b7f33" /></svg>
      </div>
      <div className="absolute right-[26%] top-[2%]" style={layer(-16, 10)}>
        <svg className="mn-f-a h-11 w-11 drop-shadow" viewBox="0 0 48 48"><g transform="rotate(-18 24 24)"><rect x="10" y="19" width="28" height="12" rx="6" fill="#dff7b8" /><path d="M24 19H14a6 6 0 0 0 0 12h10z" fill="#fff" /></g></svg>
      </div>
      <span className="absolute left-[12%] top-[46%] text-xl font-black text-white/40" style={layer(14, 14)}>+</span>
      <span className="absolute right-[16%] top-[54%] text-lg font-black text-lime-200/60" style={layer(-12, -10)}>+</span>
    </div>
  );
}
