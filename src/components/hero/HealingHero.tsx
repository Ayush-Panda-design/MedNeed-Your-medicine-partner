"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Upload } from "lucide-react";
import { displaySerif } from "@/lib/fonts";
import "./healing-hero.css";

/*
 * Homepage hero: a calm, illustrated dawn over the Eastern Ghats, with a neem tree shedding leaves, a faint temple
 * spire on the horizon (Bhubaneswar, the temple city) and a delivery rider travelling the path to a home with a lit
 * window. All artwork is original SVG drawn for MedNeed. Night scene in dark mode.
 *
 * Motion is CSS-only (leaves, clouds, grass, rider) plus a light pointer/scroll parallax. It pauses while the hero is
 * off screen and is switched off entirely for people who prefer reduced motion.
 */

// Deterministic "random" so server and client render the same leaves (no hydration mismatch).
// Integer hash (exact on every JS engine), rounded to 3 decimals so markup is identical everywhere.
const rnd = (i: number, salt: number) => {
  let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(salt + 7, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return Math.round(((h >>> 0) / 4294967296) * 1000) / 1000;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

const LEAVES = Array.from({ length: 18 }, (_, i) => ({
  left: r2(52 + rnd(i, 1) * 50), // start under the canopy (right side)
  top: r2(8 + rnd(i, 7) * 38),
  dur: r2(9 + rnd(i, 2) * 9),
  delay: r2(-rnd(i, 3) * 18),
  size: Math.round(10 + rnd(i, 4) * 12),
  drift: r2(30 + rnd(i, 5) * 40), // how far left the wind carries it (vw)
  spin: Math.round((rnd(i, 6) > 0.5 ? 1 : -1) * (300 + rnd(i, 8) * 420)),
  tone: i % 3,
}));

const BLADES = Array.from({ length: 150 }, (_, i) => {
  const x = i * 10.9 + rnd(i, 11) * 8;
  const h = 26 + rnd(i, 12) * 46;
  const lean = (rnd(i, 13) - 0.4) * 16;
  return { d: `M${x.toFixed(1)} 900 Q${(x + lean / 2).toFixed(1)} ${(900 - h / 2).toFixed(1)} ${(x + lean).toFixed(1)} ${(900 - h).toFixed(1)} Q${(x + lean / 2 + 3).toFixed(1)} ${(900 - h / 2).toFixed(1)} ${(x + 6).toFixed(1)} 900Z`, g: i % 3, tone: i % 4 === 0 ? 2 : i % 2 };
});

const FLOWERS = Array.from({ length: 22 }, (_, i) => ({ x: r2(40 + rnd(i, 21) * 1100), y: r2(838 + rnd(i, 22) * 52), r: r2(3 + rnd(i, 23) * 3), warm: i % 3 === 0 }));
const STARS = Array.from({ length: 40 }, (_, i) => ({ x: r2(rnd(i, 31) * 1600), y: r2(rnd(i, 32) * 380), r: r2(0.8 + rnd(i, 33) * 1.6), d: r2(rnd(i, 34) * 4) }));

// Canopy blobs: [cx, cy, r, tone]
const CANOPY: [number, number, number, number][] = [
  [1180, 560, 90, 0], [1260, 470, 130, 0], [1390, 400, 150, 0], [1520, 450, 140, 0], [1600, 540, 120, 0], [1460, 300, 120, 0], [1600, 330, 120, 0], [1330, 330, 100, 0],
  [1230, 440, 70, 1], [1360, 360, 90, 1], [1480, 380, 90, 1], [1560, 290, 80, 1], [1170, 530, 50, 1], [1300, 520, 60, 1], [1580, 480, 70, 1],
  [1340, 300, 40, 2], [1450, 320, 46, 2], [1250, 410, 34, 2], [1540, 400, 38, 2], [1400, 470, 30, 2], [1600, 400, 30, 2],
];

// Small leaf shapes scattered over the canopy for texture.
const TEXTURE = Array.from({ length: 110 }, (_, i) => {
  const base = CANOPY[i % 8];
  const a = rnd(i, 41) * Math.PI * 2;
  const d = Math.sqrt(rnd(i, 42)) * base[2] * 0.95;
  return { x: r2(base[0] + Math.round(Math.cos(a) * d)), y: r2(base[1] + Math.round(Math.sin(a) * d)), rx: r2(7 + rnd(i, 43) * 7), rot: Math.round(rnd(i, 44) * 180), light: rnd(i, 45) > 0.45 };
});

const depth = (n: number): CSSProperties => ({ transform: `translate3d(calc(var(--mx) * ${n}px), calc(var(--my) * ${n * 0.5}px + var(--sy) * ${n * 1.6}px), 0)` });

export function HealingHero() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Pause every animation while the hero is off screen (saves battery and CPU).
    const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-paused", !e.isIntersecting), { threshold: 0 });
    io.observe(el);
    if (reduce) return () => io.disconnect();

    // Gentle parallax: pointer (desktop) and scroll.
    let tx = 0, ty = 0, cx = 0, cy = 0, sy = 0, raf = 0;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
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
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section aria-labelledby="hh-title" className="mx-auto max-w-[1440px] px-3 pt-3 sm:px-5 sm:pt-5">
      <div ref={root} className={`hh ${displaySerif.variable}`} style={{ "--mx": 0, "--my": 0, "--sy": 0 } as CSSProperties}>
        {/* Scene */}
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
              <stop offset="0.5" stopColor="var(--mist)" stopOpacity="0.75" />
              <stop offset="1" stopColor="var(--mist)" stopOpacity="0" />
            </linearGradient>
            <mask id="hh-crescent">
              <rect width="1600" height="900" fill="#000" />
              <circle cx="1010" cy="250" r="40" fill="#fff" />
              <circle cx="1030" cy="236" r="36" fill="#000" />
            </mask>
            <radialGradient id="hh-window" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#ffd98a" stopOpacity="0.9" />
              <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="1600" height="900" fill="url(#hh-sky)" />

          <g className="hh-stars">
            {STARS.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} style={{ animationDelay: `${-s.d}s` }} />
            ))}
          </g>

          <g style={depth(4)}>
            <circle className="hh-sunglow" cx="900" cy="430" r="300" fill="url(#hh-sun)" />
            <circle className="hh-sun" cx="900" cy="430" r="62" />
            <g className="hh-moon">
              <circle cx="1010" cy="250" r="70" fill="#f4f1e4" opacity=".08" />
              <circle cx="1010" cy="250" r="40" fill="#f4f1e4" mask="url(#hh-crescent)" />
            </g>
          </g>

          <g className="hh-clouds" style={depth(6)}>
            <g className="hh-cloud hh-cloud-a"><ellipse cx="200" cy="150" rx="120" ry="26" /><ellipse cx="250" cy="134" rx="70" ry="28" /><ellipse cx="160" cy="140" rx="54" ry="22" /></g>
            <g className="hh-cloud hh-cloud-b"><ellipse cx="820" cy="110" rx="150" ry="24" /><ellipse cx="870" cy="94" rx="80" ry="26" /></g>
            <g className="hh-cloud hh-cloud-c"><ellipse cx="1180" cy="200" rx="110" ry="20" /><ellipse cx="1220" cy="188" rx="60" ry="22" /></g>
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
            <rect y="470" width="1600" height="120" fill="url(#hh-mist)" />
          </g>

          {/* Mid hills, path, home, rider */}
          <g style={depth(16)}>
            <path className="hh-hill" d="M0 640 C180 590 320 600 460 620 C620 642 720 600 880 596 C1040 592 1160 640 1320 630 C1440 622 1520 600 1600 606 V900 H0Z" />
            <path className="hh-hill2" d="M0 700 C160 668 300 676 460 690 C640 706 760 676 920 672 C1080 668 1200 700 1360 694 C1480 690 1540 676 1600 680 V900 H0Z" />
            <path className="hh-path" d="M300 900 C420 812 600 780 744 752 C866 728 936 690 988 626 L1004 626 C956 700 888 748 774 776 C640 808 520 836 470 900Z" />
            <g transform="translate(978 576)">
              <circle cx="32" cy="34" r="46" fill="url(#hh-window)" className="hh-glow" />
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

          {/* Neem tree */}
          <g style={depth(26)}>
            <g className="hh-tree">
              <path className="hh-trunk" d="M1340 900 C1330 820 1320 760 1300 700 C1285 650 1240 610 1190 590 L1205 575 C1260 595 1300 630 1320 670 C1330 620 1350 560 1400 520 L1412 532 C1372 572 1356 630 1352 690 C1380 640 1430 610 1490 600 L1494 616 C1440 628 1398 660 1376 720 C1366 770 1372 840 1386 900Z" />
              {CANOPY.filter((c) => c[3] === 0).map(([x, y, r], i) => (
                <circle key={`s${i}`} className="hh-leafshade" cx={x + 10} cy={y + 18} r={r} />
              ))}
              {CANOPY.map(([x, y, r, t], i) => (
                <circle key={i} className={`hh-leaf${t}`} cx={x} cy={y} r={r} />
              ))}
              {TEXTURE.map((l, i) => (
                <ellipse key={`t${i}`} className={l.light ? "hh-leaf2" : "hh-leafshade"} cx={l.x} cy={l.y} rx={l.rx} ry={l.rx * 0.42} transform={`rotate(${l.rot} ${l.x} ${l.y})`} opacity={l.light ? 0.6 : 0.35} />
              ))}
            </g>
          </g>

          {/* Foreground meadow */}
          <g style={depth(40)}>
            <path className="hh-grass0" d="M0 820 C200 790 400 800 600 812 C820 826 1000 800 1200 806 C1400 812 1500 790 1600 796 V900 H0Z" />
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
        </svg>

        {/* Falling neem leaves */}
        <div className="hh-leaves" aria-hidden>
          {LEAVES.map((l, i) => (
            <span
              key={i}
              className="hh-fall"
              style={{ left: `${l.left}%`, top: `${l.top}%`, animationDuration: `${l.dur}s`, animationDelay: `${l.delay}s`, "--drift": `${l.drift}vw`, "--spin": `${l.spin}deg` } as CSSProperties}
            >
              <svg viewBox="0 0 24 12" width={l.size} height={Math.round(l.size / 2)} className={`hh-leafsvg hh-tone${l.tone}`} style={{ animationDuration: `${2.2 + (i % 4) * 0.6}s` }}>
                <path d="M1 6 C6 0 16 0 23 6 C16 12 6 12 1 6Z" />
                <path d="M2 6 H21" stroke="rgb(0 0 0 / .22)" strokeWidth=".8" fill="none" />
              </svg>
            </span>
          ))}
        </div>

        <div className="hh-scrim" aria-hidden />

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
        </div>

        <p className="hh-badge hh-in" style={{ "--d": "760ms" } as CSSProperties}>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Pharmacist-verified · Genuine medicines · GST invoice
        </p>
      </div>
    </section>
  );
}
