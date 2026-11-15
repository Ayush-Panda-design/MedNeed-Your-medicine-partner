"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Check, Pill, ShieldCheck, Truck, Upload } from "lucide-react";
import { displaySerif } from "@/lib/fonts";
import "./healing-hero.css";

/*
 * Homepage hero: a calm, illustrated dawn over the Eastern Ghats (a Kalinga-style temple spire against the rising
 * sun, a neem tree shedding leaves, a delivery rider on the path to a lit home), with floating glass cards that tell
 * the MedNeed story (order tracker, pharmacist check, a medicine). All artwork is original SVG drawn for MedNeed.
 * Night scene in dark mode.
 *
 * Motion is CSS-driven (leaves, birds, rays, mist, grass, rider, cards) plus a light pointer/scroll parallax and a
 * small timer for the tracker card. Everything pauses while the hero is off screen and is switched off for people
 * who prefer reduced motion.
 */

// Integer hash (exact on every JS engine), rounded, so server and client markup are identical.
const rnd = (i: number, salt: number) => {
  let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(salt + 7, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return Math.round(((h >>> 0) / 4294967296) * 1000) / 1000;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

const LEAVES = Array.from({ length: 34 }, (_, i) => ({
  left: r2(48 + rnd(i, 1) * 54),
  top: r2(4 + rnd(i, 7) * 46),
  dur: r2(8 + rnd(i, 2) * 9),
  delay: r2(-rnd(i, 3) * 17),
  size: Math.round(11 + rnd(i, 4) * 15),
  drift: r2(28 + rnd(i, 5) * 46),
  spin: Math.round((rnd(i, 6) > 0.5 ? 1 : -1) * (300 + rnd(i, 8) * 420)),
  tone: i % 3,
}));

// Big, soft-focus leaves passing close to the "camera".
const NEAR_LEAVES = Array.from({ length: 5 }, (_, i) => ({
  left: r2(60 + rnd(i, 51) * 40),
  top: r2(-6 + rnd(i, 52) * 30),
  dur: r2(13 + rnd(i, 53) * 8),
  delay: r2(-rnd(i, 54) * 20),
  size: Math.round(46 + rnd(i, 55) * 34),
  drift: r2(55 + rnd(i, 56) * 35),
  spin: Math.round(180 + rnd(i, 57) * 240),
  tone: i % 3,
}));

const BLADES = Array.from({ length: 160 }, (_, i) => {
  const x = i * 10.2 + rnd(i, 11) * 8;
  const h = 26 + rnd(i, 12) * 50;
  const lean = (rnd(i, 13) - 0.4) * 16;
  const f = (n: number) => n.toFixed(1);
  return { d: `M${f(x)} 900 Q${f(x + lean / 2)} ${f(900 - h / 2)} ${f(x + lean)} ${f(900 - h)} Q${f(x + lean / 2 + 3)} ${f(900 - h / 2)} ${f(x + 6)} 900Z`, g: i % 3, tone: i % 4 === 0 ? 2 : i % 2 };
});

const FLOWERS = Array.from({ length: 26 }, (_, i) => ({ x: r2(30 + rnd(i, 21) * 1150), y: r2(840 + rnd(i, 22) * 50), r: r2(3 + rnd(i, 23) * 3), warm: i % 3 === 0 }));
const STARS = Array.from({ length: 46 }, (_, i) => ({ x: r2(rnd(i, 31) * 1600), y: r2(rnd(i, 32) * 400), r: r2(0.8 + rnd(i, 33) * 1.6), d: r2(rnd(i, 34) * 4) }));
const FIREFLIES = Array.from({ length: 14 }, (_, i) => ({ left: r2(5 + rnd(i, 61) * 80), top: r2(62 + rnd(i, 62) * 30), d: r2(rnd(i, 63) * 6), dur: r2(5 + rnd(i, 64) * 5) }));

// Canopy blobs: [cx, cy, r, tone] (drawn smaller via the tree's transform)
const CANOPY: [number, number, number, number][] = [
  [1170, 560, 80, 0], [1250, 480, 120, 0], [1380, 410, 140, 0], [1510, 450, 130, 0], [1600, 530, 110, 0], [1450, 310, 115, 0], [1600, 340, 115, 0], [1320, 340, 95, 0],
  [1220, 450, 66, 1], [1350, 370, 84, 1], [1470, 380, 86, 1], [1560, 300, 76, 1], [1170, 530, 46, 1], [1300, 520, 56, 1], [1570, 470, 66, 1], [1420, 470, 60, 1],
  [1330, 312, 38, 2], [1440, 330, 44, 2], [1240, 420, 32, 2], [1530, 400, 36, 2], [1395, 445, 28, 2], [1590, 390, 28, 2], [1290, 470, 26, 2],
];

const TEXTURE = Array.from({ length: 130 }, (_, i) => {
  const base = CANOPY[i % 8];
  const a = rnd(i, 41) * Math.PI * 2;
  const d = Math.sqrt(rnd(i, 42)) * base[2] * 0.95;
  return { x: base[0] + Math.round(Math.cos(a) * d), y: base[1] + Math.round(Math.sin(a) * d), rx: r2(6 + rnd(i, 43) * 6), rot: Math.round(rnd(i, 44) * 180), light: rnd(i, 45) > 0.45 };
});

const STEPS = [
  { label: "Order placed", sub: "Paracetamol 650 · Vitamin D3", pct: 18, icon: "pill" },
  { label: "Pharmacist verified", sub: "Prescription checked and approved", pct: 42, icon: "shield" },
  { label: "Packed", sub: "Sealed at your nearest MedNeed store", pct: 64, icon: "check" },
  { label: "Out for delivery", sub: "Arriving in about 20 minutes", pct: 86, icon: "truck" },
  { label: "Delivered", sub: "Get well soon!", pct: 100, icon: "check" },
] as const;

const depth = (n: number): CSSProperties => ({ transform: `translate3d(calc(var(--mx) * ${n}px), calc(var(--my) * ${n * 0.5}px + var(--sy) * ${n * 1.6}px), 0)` });

function StepIcon({ name }: { name: (typeof STEPS)[number]["icon"] }) {
  const cls = "h-4 w-4";
  if (name === "pill") return <Pill className={cls} aria-hidden />;
  if (name === "shield") return <ShieldCheck className={cls} aria-hidden />;
  if (name === "truck") return <Truck className={cls} aria-hidden />;
  return <Check className={cls} aria-hidden />;
}

export function HealingHero() {
  const root = useRef<HTMLDivElement>(null);
  const visible = useRef(true);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      el.toggleAttribute("data-paused", !e.isIntersecting);
    });
    io.observe(el);
    if (reduce) return () => io.disconnect();

    // Tracker card walks through the order journey.
    const timer = window.setInterval(() => {
      if (visible.current && !document.hidden) setStep((s) => (s + 1) % STEPS.length);
    }, 2600);

    // Gentle parallax: pointer (desktop) and scroll.
    let tx = 0, ty = 0, cx = 0, cy = 0, sy = 0, raf = 0;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const tick = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      el.style.setProperty("--mx", cx.toFixed(3));
      el.style.setProperty("--my", cy.toFixed(3));
      el.style.setProperty("--sy", sy.toFixed(3));
      raf = Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * -2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * -2;
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };
    const onScroll = () => {
      sy = Math.max(0, Math.min(1, window.scrollY / window.innerHeight));
      kick();
    };
    if (fine) {
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.clearInterval(timer);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const s = STEPS[step];

  return (
    <section id="mn-cine" aria-labelledby="hh-title" className="relative">
      <div ref={root} className={`hh ${displaySerif.variable}`} style={{ "--mx": 0, "--my": 0, "--sy": 0 } as CSSProperties}>
        <svg className="hh-scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
          <defs>
            <linearGradient id="hh-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--sky1)" />
              <stop offset="0.55" stopColor="var(--sky2)" />
              <stop offset="1" stopColor="var(--sky3)" />
            </linearGradient>
            <radialGradient id="hh-sun" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="var(--sunglow)" stopOpacity="0.95" />
              <stop offset="1" stopColor="var(--sunglow)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="hh-mist" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--mist)" stopOpacity="0" />
              <stop offset="0.5" stopColor="var(--mist)" stopOpacity="0.7" />
              <stop offset="1" stopColor="var(--mist)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hh-ray" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="var(--sunglow)" stopOpacity="0.55" />
              <stop offset="1" stopColor="var(--sunglow)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hh-hillg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--hillTop)" />
              <stop offset="1" stopColor="var(--hill)" />
            </linearGradient>
            <linearGradient id="hh-hill2g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--hill2Top)" />
              <stop offset="1" stopColor="var(--hill2)" />
            </linearGradient>
            <linearGradient id="hh-grassg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--grassTop)" />
              <stop offset="1" stopColor="var(--grass0)" />
            </linearGradient>
            {(["0", "1", "2"] as const).map((t) => (
              <radialGradient key={t} id={`hh-leafg${t}`} cx="0.35" cy="0.3" r="0.75">
                <stop offset="0" stopColor={`var(--leaf${t}Hi)`} />
                <stop offset="1" stopColor={`var(--leaf${t})`} />
              </radialGradient>
            ))}
            <radialGradient id="hh-window" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#ffd98a" stopOpacity="0.9" />
              <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
            </radialGradient>
            <mask id="hh-crescent">
              <rect width="1600" height="900" fill="#000" />
              <circle cx="1250" cy="170" r="40" fill="#fff" />
              <circle cx="1270" cy="156" r="36" fill="#000" />
            </mask>
            <filter id="hh-grain" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>

          <rect width="1600" height="900" fill="url(#hh-sky)" />

          <g className="hh-stars">
            {STARS.map((st, i) => (
              <circle key={i} cx={st.x} cy={st.y} r={st.r} style={{ animationDelay: `${-st.d}s` }} />
            ))}
          </g>

          <g style={depth(4)}>
            <g className="hh-rays">
              {Array.from({ length: 14 }, (_, i) => (
                <path key={i} d="M900 430 L1500 400 L1500 460Z" fill="url(#hh-ray)" transform={`rotate(${Math.round(i * (360 / 14))} 900 430)`} />
              ))}
            </g>
            <circle className="hh-sunglow" cx="900" cy="430" r="300" fill="url(#hh-sun)" />
            <circle className="hh-sun" cx="900" cy="430" r="62" />
            <g className="hh-moon">
              <circle cx="1250" cy="170" r="70" fill="#f4f1e4" opacity=".08" />
              <circle cx="1250" cy="170" r="40" fill="#f4f1e4" mask="url(#hh-crescent)" />
            </g>
          </g>

          <g className="hh-clouds" style={depth(6)}>
            <g className="hh-cloud hh-cloud-a"><ellipse cx="200" cy="150" rx="120" ry="26" /><ellipse cx="250" cy="134" rx="70" ry="28" /><ellipse cx="160" cy="140" rx="54" ry="22" /></g>
            <g className="hh-cloud hh-cloud-b"><ellipse cx="820" cy="110" rx="150" ry="24" /><ellipse cx="870" cy="94" rx="80" ry="26" /></g>
            <g className="hh-cloud hh-cloud-c"><ellipse cx="1180" cy="200" rx="110" ry="20" /><ellipse cx="1220" cy="188" rx="60" ry="22" /></g>
          </g>

          {/* Birds */}
          <g className="hh-birds">
            {[0, 1, 2, 3].map((i) => (
              <g key={i} className={`hh-bird hh-bird-${i}`}>
                <path className="hh-wing" d="M-12 0 Q-6 -7 0 0 Q6 -7 12 0" fill="none" strokeWidth="2.4" strokeLinecap="round" />
              </g>
            ))}
          </g>

          {/* Far ranges + temple spire */}
          <g style={depth(10)}>
            <path className="hh-far1" d="M0 520 C120 470 200 430 300 450 C400 470 460 400 560 390 C660 380 720 440 820 430 C940 418 1000 360 1110 370 C1220 380 1280 440 1400 430 C1480 424 1540 400 1600 410 V900 H0Z" />
            <g className="hh-temple" transform="translate(905 452) scale(1.15)">
              <path d="M-48 62 L-48 40 C-48 26 -44 16 -38 10 Q-34 6 -30 10 C-24 16 -20 26 -20 40 L-20 62Z" />
              <path d="M20 62 L20 40 C20 26 24 16 30 10 Q34 6 38 10 C44 16 48 26 48 40 L48 62Z" />
              <path d="M-22 62 L-22 30 C-22 6 -15 -14 -7 -25 Q0 -31 7 -25 C15 -14 22 6 22 30 L22 62Z" />
              <ellipse cx="0" cy="-28" rx="11" ry="3.6" />
              <path d="M-2.5 -31 C-2.5 -36 2.5 -36 2.5 -31Z M-0.8 -35 L0 -42 L0.8 -35Z" />
              <g className="hh-temple-ribs"><path d="M-21 40 H21 M-19 22 H19 M-15 6 H15 M-10 -8 H10" /></g>
            </g>
            <path className="hh-far2" d="M0 560 C140 520 240 500 360 520 C470 538 540 480 660 482 C780 484 860 530 980 520 C1100 510 1180 470 1300 480 C1420 490 1500 530 1600 520 V900 H0Z" />
            <g className="hh-mistband">
              <rect x="-400" y="470" width="2400" height="120" fill="url(#hh-mist)" />
            </g>
          </g>

          {/* Mid hills, path, home, rider */}
          <g style={depth(16)}>
            <path fill="url(#hh-hillg)" d="M0 640 C180 590 320 600 460 620 C620 642 720 600 880 596 C1040 592 1160 640 1320 630 C1440 622 1520 600 1600 606 V900 H0Z" />
            <path fill="url(#hh-hill2g)" d="M0 700 C160 668 300 676 460 690 C640 706 760 676 920 672 C1080 668 1200 700 1360 694 C1480 690 1540 676 1600 680 V900 H0Z" />
            <path className="hh-path" d="M300 900 C420 812 600 780 744 752 C866 728 936 690 988 626 L1004 626 C956 700 888 748 774 776 C640 808 520 836 470 900Z" />
            <g transform="translate(978 576)">
              <circle cx="32" cy="34" r="50" fill="url(#hh-window)" className="hh-glow" />
              <rect className="hh-house" x="2" y="22" width="60" height="40" rx="2" />
              <path className="hh-roof" d="M-6 24 L32 -2 L70 24Z" />
              <rect className="hh-roof" x="46" y="0" width="8" height="14" />
              <rect className="hh-window" x="12" y="32" width="14" height="12" rx="1.5" />
              <rect className="hh-door" x="36" y="38" width="12" height="24" rx="1.5" />
              <rect fill="#16a34a" x="13.5" y="36.5" width="11" height="3" rx="1" opacity=".9" />
              <rect fill="#16a34a" x="17.5" y="32.5" width="3" height="11" rx="1" opacity=".9" />
            </g>
            <g className="hh-rider">
              <g transform="translate(-26 -40)">
                <ellipse cx="26" cy="40" rx="26" ry="4" fill="rgb(0 0 0 / .18)" />
                <circle cx="8" cy="34" r="7" className="hh-tyre" />
                <circle cx="44" cy="34" r="7" className="hh-tyre" />
                <path d="M8 34 L22 34 L28 22 L38 22 L44 34" fill="none" stroke="#0b5a2b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="24" y="4" width="18" height="15" rx="2.5" fill="#16a34a" />
                <path d="M31.5 7.5h3v3h3v3h-3v3h-3v-3h-3v-3h3z" fill="#fff" />
                <circle cx="20" cy="6" r="5" className="hh-helmet" />
                <path d="M18 11 L24 22" stroke="#f1d3b3" strokeWidth="4" strokeLinecap="round" />
              </g>
            </g>
          </g>

          {/* Neem tree (scaled down, anchored at its base on the right) */}
          <g style={depth(24)}>
            <g transform="translate(1600 900) scale(0.86) translate(-1600 -900)">
              <g className="hh-tree">
                <path className="hh-trunk" d="M1340 900 C1330 820 1320 760 1300 700 C1285 650 1240 610 1190 590 L1205 575 C1260 595 1300 630 1320 670 C1330 620 1350 560 1400 520 L1412 532 C1372 572 1356 630 1352 690 C1380 640 1430 610 1490 600 L1494 616 C1440 628 1398 660 1376 720 C1366 770 1372 840 1386 900Z" />
                {CANOPY.filter((c) => c[3] === 0).map(([x, y, r], i) => (
                  <circle key={`s${i}`} className="hh-leafshade" cx={x + 10} cy={y + 18} r={r} />
                ))}
                {CANOPY.map(([x, y, r, t], i) => (
                  <circle key={i} fill={`url(#hh-leafg${t})`} cx={x} cy={y} r={r} />
                ))}
                {TEXTURE.map((l, i) => (
                  <ellipse key={`t${i}`} className={l.light ? "hh-leaf2" : "hh-leafshade"} cx={l.x} cy={l.y} rx={l.rx} ry={r2(l.rx * 0.42)} transform={`rotate(${l.rot} ${l.x} ${l.y})`} opacity={l.light ? 0.55 : 0.32} />
                ))}
              </g>
            </g>
          </g>

          {/* Foreground meadow */}
          <g style={depth(40)}>
            <path fill="url(#hh-grassg)" d="M0 820 C200 790 400 800 600 812 C820 826 1000 800 1200 806 C1400 812 1500 790 1600 796 V900 H0Z" />
            {[0, 1, 2].map((g) => (
              <g key={g} className={`hh-blades hh-blades-${g}`}>
                {BLADES.filter((b) => b.g === g).map((b, i) => (
                  <path key={i} d={b.d} className={`hh-blade${b.tone}`} />
                ))}
              </g>
            ))}
            {FLOWERS.map((f, i) => (
              <g key={i}>
                <circle cx={f.x} cy={f.y} r={f.r} className={f.warm ? "hh-flower-warm" : "hh-flower"} />
                <circle cx={f.x} cy={f.y} r={r2(f.r * 0.4)} fill="#f6c343" />
              </g>
            ))}
          </g>

          {/* Paper grain for an illustrated, painterly finish */}
          <rect width="1600" height="900" filter="url(#hh-grain)" className="hh-grainlayer" />
        </svg>

        {/* Falling neem leaves + fireflies */}
        <div className="hh-leaves" aria-hidden>
          {LEAVES.map((l, i) => (
            <span key={i} className="hh-fall" style={{ left: `${l.left}%`, top: `${l.top}%`, animationDuration: `${l.dur}s`, animationDelay: `${l.delay}s`, "--drift": `${l.drift}vw`, "--spin": `${l.spin}deg` } as CSSProperties}>
              <svg viewBox="0 0 24 12" width={l.size} height={Math.round(l.size / 2)} className={`hh-leafsvg hh-tone${l.tone}`} style={{ animationDuration: `${(2 + (i % 4) * 0.6).toFixed(1)}s` }}>
                <path d="M1 6 C6 0 16 0 23 6 C16 12 6 12 1 6Z" />
                <path d="M2 6 H21" stroke="rgb(0 0 0 / .22)" strokeWidth=".8" fill="none" />
              </svg>
            </span>
          ))}
          {FIREFLIES.map((f, i) => (
            <span key={`f${i}`} className="hh-firefly" style={{ left: `${f.left}%`, top: `${f.top}%`, animationDelay: `${-f.d}s`, animationDuration: `${f.dur}s` }} />
          ))}
        </div>

        <div className="hh-scrim" aria-hidden />

        {/* Near-camera leaves (blurred, in front of the scene) */}
        <div className="hh-near" aria-hidden>
          {NEAR_LEAVES.map((l, i) => (
            <span key={i} className="hh-fall hh-fall-near" style={{ left: `${l.left}%`, top: `${l.top}%`, animationDuration: `${l.dur}s`, animationDelay: `${l.delay}s`, "--drift": `${l.drift}vw`, "--spin": `${l.spin}deg` } as CSSProperties}>
              <svg viewBox="0 0 24 12" width={l.size} height={Math.round(l.size / 2)} className={`hh-leafsvg hh-tone${l.tone}`}>
                <path d="M1 6 C6 0 16 0 23 6 C16 12 6 12 1 6Z" />
              </svg>
            </span>
          ))}
        </div>

        {/* Floating story cards (decorative; larger screens) */}
        <div className="hh-cards" aria-hidden>
          <div className="hh-card hh-card-track hh-in" style={{ "--d": "900ms" } as CSSProperties}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Your order</span>
              <span className="text-[11px] text-white/60">#MN-2481</span>
            </div>
            <div key={step} className="hh-step mt-2.5 flex items-center gap-2.5">
              <span className="hh-step-icon"><StepIcon name={s.icon} /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">{s.label}</span>
                <span className="block truncate text-xs text-white/70">{s.sub}</span>
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="hh-progress h-full rounded-full" style={{ width: `${s.pct}%` }} />
            </div>
            <div className="mt-2 flex gap-1.5">
              {STEPS.map((_, i) => (
                <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= step ? "bg-lime-300" : "bg-white/20"}`} />
              ))}
            </div>
          </div>

          <div className="hh-card hh-card-rx hh-in" style={{ "--d": "1150ms" } as CSSProperties}>
            <span className="hh-rx-badge">Rx</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white">Prescription verified</span>
              <span className="block text-xs text-white/70">by a registered pharmacist</span>
            </span>
            <svg className="hh-tick" viewBox="0 0 24 24" width="22" height="22">
              <circle cx="12" cy="12" r="11" />
              <path d="M7 12.5 L10.5 16 L17 9" />
            </svg>
          </div>

          <div className="hh-card hh-card-med hh-in" style={{ "--d": "1400ms" } as CSSProperties}>
            <span className="hh-med-icon"><Pill className="h-5 w-5" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white">Paracetamol 650</span>
              <span className="block text-xs text-white/70">Strip of 15 · In stock</span>
            </span>
            <span className="hh-med-tag">Genuine</span>
          </div>
        </div>

        <a href="#after-hero" className="hh-scrollcue" aria-label="Scroll to explore">
          <span className="hh-mouse" aria-hidden><span /></span>
        </a>

        {/* Content */}
        <div className="hh-content">
          <p className="hh-chip hh-in" style={{ "--d": "0ms" } as CSSProperties}>
            <span className="hh-live" aria-hidden /> Now delivering across Bhubaneswar
          </p>

          <h1 id="hh-title" className="hh-title">
            <span className="hh-line hh-in" style={{ "--d": "120ms" } as CSSProperties}>Good health,</span>
            <span className="hh-line hh-in" style={{ "--d": "260ms" } as CSSProperties}>
              <em>delivered</em> to your door.
            </span>
          </h1>

          <p className="hh-sub hh-in" style={{ "--d": "420ms" } as CSSProperties}>
            Genuine medicines from your neighbourhood pharmacy, checked by a registered pharmacist and brought to you between 7&nbsp;AM and 10&nbsp;PM.
          </p>

          <div className="hh-actions hh-in" style={{ "--d": "560ms" } as CSSProperties}>
            <Link href="/medicines" className="hh-btn-primary group">
              Order medicines <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link href="/account/prescriptions/new" className="hh-btn-ghost">
              <Upload className="h-4 w-4" aria-hidden /> Upload prescription
            </Link>
          </div>

          <ul className="hh-points hh-in" style={{ "--d": "700ms" } as CSSProperties}>
            <li><ShieldCheck className="h-4 w-4" aria-hidden /> Pharmacist-verified</li>
            <li><Check className="h-4 w-4" aria-hidden /> Genuine medicines</li>
            <li><Truck className="h-4 w-4" aria-hidden /> Free delivery over ₹499</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
