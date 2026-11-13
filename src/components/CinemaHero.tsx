"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";

/* An original cinematic hero: a stylised city-at-dusk pharmacy scene that zooms and shifts
   day -> night -> day as the page scrolls, with the MedNeed story told in beats. All artwork is
   hand-built SVG. Pinned-scroll is disabled for reduced-motion users (they get a calm static hero). */

const DAY = { skyTop: "#8ecbff", skyBottom: "#eaf7ef", cityFar: "#cfe6d8", building: "#3aa05a", buildingDark: "#227a46", ground: "#1f8a3e", groundDark: "#136a2c", road: "#9fb0a6" };
const NIGHT = { skyTop: "#06203a", skyBottom: "#0a2f24", cityFar: "#0c2c20", building: "#103a25", buildingDark: "#0a2c1a", ground: "#07241a", groundDark: "#041810", road: "#122018" };

const BEATS = [
  { eyebrow: "MEDNEED", title: "Health help, any hour.", sub: "Medicines and everyday essentials, delivered to your door." },
  { eyebrow: "ORDER", title: "Sorted in a few taps.", sub: "Search, add to cart, and upload your prescription — done." },
  { eyebrow: "VERIFIED", title: "Checked by a real pharmacist.", sub: "Every prescription order is verified before it is packed." },
  { eyebrow: "DELIVERED", title: "At your door, fast.", sub: "Across Bhubaneswar, every day from 7 AM to 10 PM.", cta: true },
];

const hx = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number) => { const x = hx(a), y = hx(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`; };

function Windows({ x, y, cols, rows, w = 10, h = 14, gx = 20, gy = 24 }: { x: number; y: number; cols: number; rows: number; w?: number; h?: number; gx?: number; gy?: number }) {
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push(<rect key={`${r}-${c}`} x={x + c * gx} y={y + r * gy} width={w} height={h} rx={1.5} />);
  return <>{out}</>;
}

export function CinemaHero() {
  const [animated, setAnimated] = useState(true);
  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setAnimated(false); return; }
    const section = sectionRef.current, stage = stageRef.current, zoom = zoomRef.current;
    if (!section || !stage || !zoom) return;

    let raf = 0;
    const apply = () => {
      raf = 0;
      const vh = window.innerHeight;
      const p = Math.max(0, Math.min(1, -section.getBoundingClientRect().top / (section.offsetHeight - vh)));
      const night = Math.sin(p * Math.PI); // day -> night -> day
      for (const k of Object.keys(DAY) as (keyof typeof DAY)[]) stage.style.setProperty(`--${k}`, mix(DAY[k], NIGHT[k], night));
      stage.style.setProperty("--sun", String(1 - night));
      stage.style.setProperty("--moon", String(night));
      stage.style.setProperty("--stars", String(night));
      stage.style.setProperty("--glow", String(night));
      zoom.style.transform = `scale(${1 + Math.sin(p * Math.PI) * 0.26})`;
      if (hintRef.current) hintRef.current.style.opacity = String(Math.max(0, 1 - p * 12));
      const N = BEATS.length;
      beatRefs.current.forEach((el, i) => {
        if (!el) return;
        const c = (i + 0.5) / N;
        let o = Math.max(0, 1 - Math.abs(p - c) / 0.17);
        if (i === 0 && p < c) o = 1;
        if (i === N - 1 && p > c) o = 1;
        el.style.opacity = String(o);
        el.style.transform = `translateY(${((p - c) * 70).toFixed(1)}px)`;
        el.style.pointerEvents = o > 0.6 ? "auto" : "none";
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    apply();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [animated]);

  const scene = (
    <div ref={stageRef} className="mn-stage absolute inset-0 overflow-hidden" style={{ ["--sun" as string]: 1, ["--moon" as string]: 0, ["--stars" as string]: 0, ["--glow" as string]: 0 }}>
      <div ref={zoomRef} className="mn-cine-zoom absolute inset-0">
        <svg className="h-full w-full" viewBox="0 0 1440 820" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <linearGradient id="mn-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--skyTop)" /><stop offset="1" stopColor="var(--skyBottom)" /></linearGradient>
            <radialGradient id="mn-sunglow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffe08a" stopOpacity="0.9" /><stop offset="1" stopColor="#ffe08a" stopOpacity="0" /></radialGradient>
            <filter id="mn-soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" /></filter>
          </defs>

          <rect width="1440" height="820" fill="url(#mn-sky)" />
          <g fill="#ffffff" style={{ opacity: "var(--stars)" }}>
            {[[120, 90], [300, 160], [520, 70], [760, 130], [980, 90], [1180, 190], [1320, 110], [220, 240], [640, 220], [1080, 250], [1400, 60], [60, 180]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={i % 3 ? 2 : 3} />)}
          </g>
          <circle cx="1150" cy="190" r="150" fill="url(#mn-sunglow)" style={{ opacity: "var(--sun)" }} />
          <circle cx="1150" cy="190" r="60" fill="#ffd45e" style={{ opacity: "var(--sun)" }} />
          <g style={{ opacity: "var(--moon)" }}><circle cx="1150" cy="180" r="52" fill="#eaf0ff" /><circle cx="1176" cy="164" r="52" fill="var(--skyTop)" /></g>

          {/* far skyline */}
          <g fill="var(--cityFar)">
            <rect x="0" y="470" width="90" height="160" /><rect x="110" y="430" width="70" height="200" /><rect x="360" y="450" width="80" height="180" /><rect x="470" y="420" width="60" height="210" /><rect x="880" y="440" width="90" height="190" /><rect x="1240" y="430" width="80" height="200" /><rect x="1350" y="470" width="90" height="160" />
          </g>

          {/* mid buildings */}
          <g>
            <rect x="110" y="360" width="170" height="320" fill="var(--building)" />
            <g fill="#dfeee4" style={{ opacity: "calc(1 - var(--glow))" }}><Windows x={135} y={385} cols={6} rows={11} /></g>
            <g fill="#ffd66b" style={{ opacity: "var(--glow)" }}><Windows x={135} y={385} cols={6} rows={11} /></g>

            <rect x="990" y="300" width="200" height="380" fill="var(--buildingDark)" />
            <g fill="#dfeee4" style={{ opacity: "calc(1 - var(--glow))" }}><Windows x={1015} y={325} cols={7} rows={13} /></g>
            <g fill="#ffd66b" style={{ opacity: "var(--glow)" }}><Windows x={1015} y={325} cols={7} rows={13} /></g>

            <rect x="300" y="430" width="120" height="250" fill="var(--buildingDark)" />
            <rect x="840" y="400" width="130" height="280" fill="var(--building)" />
          </g>

          {/* pharmacy, centre */}
          <g>
            <rect x="560" y="360" width="250" height="320" fill="#ffffff" />
            <rect x="560" y="360" width="250" height="60" fill="var(--building)" />
            {/* glowing cross sign */}
            <g style={{ opacity: "var(--glow)" }}><g filter="url(#mn-soft)" fill="#5ff07f"><rect x="668" y="372" width="34" height="12" rx="3" /><rect x="679" y="361" width="12" height="34" rx="3" /></g></g>
            <g fill="#1b7f33"><rect x="668" y="372" width="34" height="12" rx="3" /><rect x="679" y="361" width="12" height="34" rx="3" /></g>
            {/* door + windows lit */}
            <rect x="650" y="560" width="70" height="120" fill="var(--buildingDark)" />
            <g fill="#dfeee4" style={{ opacity: "calc(1 - var(--glow))" }}><rect x="585" y="450" width="55" height="70" rx="3" /><rect x="735" y="450" width="55" height="70" rx="3" /></g>
            <g fill="#ffd66b" style={{ opacity: "var(--glow)" }}><rect x="585" y="450" width="55" height="70" rx="3" /><rect x="735" y="450" width="55" height="70" rx="3" /></g>
          </g>

          {/* ground + road */}
          <rect x="0" y="660" width="1440" height="160" fill="var(--ground)" />
          <rect x="0" y="712" width="1440" height="54" fill="var(--road)" />
          <g fill="#f4e7b0" style={{ opacity: "0.7" }}>{[40, 200, 360, 520, 680, 840, 1000, 1160, 1320].map((x) => <rect key={x} x={x} y={737} width={60} height={5} rx={2.5} />)}</g>

          {/* delivery scooter with a MedNeed box */}
          <g transform="translate(470 672)">
            <ellipse cx="60" cy="74" rx="90" ry="8" fill="#000" opacity="0.18" />
            <circle cx="16" cy="60" r="20" fill="#1c2a22" /><circle cx="16" cy="60" r="8" fill="#5b6b61" />
            <circle cx="120" cy="60" r="20" fill="#1c2a22" /><circle cx="120" cy="60" r="8" fill="#5b6b61" />
            <path d="M16 60 L58 60 L72 34 L96 34 L120 60" fill="none" stroke="#0b5a2b" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
            <rect x="70" y="4" width="40" height="34" rx="5" fill="#1b7f33" />
            <path d="M86 12h8v6h6v8h-6v6h-8v-6h-6v-8h6z" fill="#fff" />
            <path d="M96 34 q24 -4 30 -22" fill="none" stroke="#0b5a2b" strokeWidth="7" strokeLinecap="round" />
            {/* headlight cone at night */}
            <path d="M130 44 L210 24 L210 70 L130 60 Z" fill="#ffe9a8" style={{ opacity: "calc(var(--glow) * 0.5)" }} />
          </g>

          {/* foreground floating capsules */}
          <g className="mn-f-a" transform="translate(180 720)"><g transform="rotate(30)"><rect x="-26" y="-9" width="52" height="18" rx="9" fill="#fff" /><rect x="0" y="-9" width="26" height="18" rx="9" fill="#bff069" /></g></g>
          <g className="mn-f-b" transform="translate(1280 735)"><g transform="rotate(-18)"><rect x="-22" y="-8" width="44" height="16" rx="8" fill="#dff7b8" /><rect x="-22" y="-8" width="22" height="16" rx="8" fill="#fff" /></g></g>
        </svg>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25" />
      </div>
    </div>
  );

  if (!animated) {
    return (
      <section id="mn-cine" className="relative overflow-hidden text-white">
        <div className="relative h-[82vh] min-h-[560px]">
          {scene}
        <div className="pointer-events-none absolute inset-0 z-[1]" style={{ background: "radial-gradient(ellipse 62% 56% at 50% 47%, rgba(3,18,11,0.55), transparent 72%)" }} />
          <div className="relative z-10 mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-4 text-center">
            <p className="text-sm font-semibold tracking-[0.3em] text-lime-200">{BEATS[0].eyebrow}</p>
            <h1 className="mt-3 text-4xl font-extrabold drop-shadow sm:text-6xl">{BEATS[0].title}</h1>
            <p className="mt-4 max-w-xl text-lg text-white/85">{BEATS[0].sub}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/medicines" data-fx="shine" className="mn-fx-shine inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-teal-800 hover:bg-teal-50">Order medicines <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/account/prescriptions/new" className="inline-flex items-center gap-2 rounded-xl border border-white/50 px-6 py-3 font-semibold hover:bg-white/10"><Upload className="h-4 w-4" /> Upload prescription</Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="mn-cine" ref={sectionRef} className="relative h-[360vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden text-white">
        {scene}
        <div className="pointer-events-none absolute inset-0 z-[1]" style={{ background: "radial-gradient(ellipse 62% 56% at 50% 47%, rgba(3,18,11,0.55), transparent 72%)" }} />
        <div className="relative z-10 h-full">
          {BEATS.map((b, i) => (
            <div key={i} ref={(el) => { beatRefs.current[i] = el; }} className="mn-beat absolute inset-0 mx-auto flex max-w-4xl flex-col items-center justify-center px-4 text-center" style={{ opacity: i === 0 ? 1 : 0 }}>
              <p className="text-xs font-semibold tracking-[0.35em] text-lime-200 sm:text-sm">{b.eyebrow}</p>
              <h2 className="mt-3 text-4xl font-extrabold leading-[1.05] drop-shadow-lg sm:text-6xl md:text-7xl">{b.title}</h2>
              <p className="mt-5 max-w-xl text-base text-white/85 sm:text-xl">{b.sub}</p>
              {b.cta && (
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link href="/medicines" data-fx="shine" className="mn-fx-shine inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-teal-800 shadow-lg hover:bg-teal-50">Order medicines <ArrowRight className="h-4 w-4" /></Link>
                  <Link href="/account/prescriptions/new" className="inline-flex items-center gap-2 rounded-xl border border-white/50 px-6 py-3 font-semibold hover:bg-white/10"><Upload className="h-4 w-4" /> Upload prescription</Link>
                </div>
              )}
            </div>
          ))}
          <div ref={hintRef} className="absolute inset-x-0 bottom-7 flex flex-col items-center gap-2 text-xs font-semibold tracking-[0.3em] text-white/80">
            SCROLL
            <span className="mn-scrolldot h-8 w-5 rounded-full border border-white/50" />
          </div>
        </div>
      </div>
    </section>
  );
}
