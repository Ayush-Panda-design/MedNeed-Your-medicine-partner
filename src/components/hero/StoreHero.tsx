"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Heart, Leaf, Pill, ShieldCheck, Sparkles, Truck, Upload, UserCheck } from "lucide-react";
import { heroSerif } from "@/lib/fonts";
import "./store-hero.css";

/*
 * Homepage hero: a calm pharmacy-shelf photo that turns into a short scroll story.
 *   Scene 1  Entrance      the photo slides in from the right, the light brightens, the headline reveals line by line
 *   Scene 2  Unboxing      on scroll the lid opens and a few products rise out and float around the box
 *   Scene 3  Spotlight     one product turns gently while category labels appear (Medicines, Wellness, Personal Care)
 *   Scene 4  Delivery      the parcel rides a short route, a pin drops at the doorstep and "Delivered" appears
 *
 * The stage is sticky inside a tall section; scroll position (0..1) is turned into a handful of CSS variables
 * (--o1..4 scene opacity, --lid, --rise, --spin, --c1..3, --ride) and everything else is plain CSS.
 * Reduced motion: no scroll story, the section is a normal-height static hero (scene 1 only).
 */

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const win = (a: number, b: number, p: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const f3 = (n: number) => n.toFixed(3);

function Jar() {
  return (
    <svg viewBox="0 0 64 80" width="100%" height="100%" aria-hidden>
      <rect x="14" y="4" width="36" height="12" rx="3" fill="#fff" stroke="#9bc9d2" />
      <rect x="10" y="14" width="44" height="60" rx="10" fill="#fff" stroke="#9bc9d2" />
      <rect x="10" y="34" width="44" height="26" fill="#8fd0d8" />
      <path d="M32 40v14M25 47h14" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
function Blister() {
  return (
    <svg viewBox="0 0 80 64" width="100%" height="100%" aria-hidden>
      <rect x="4" y="6" width="72" height="52" rx="8" fill="#e8eef0" stroke="#aab9be" />
      {[0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => (
        <ellipse key={`${r}${c}`} cx={16 + c * 16} cy={18 + r * 16} rx="6" ry="6.6" fill={(r + c) % 2 ? "#f3c7bf" : "#fff"} stroke="#9aa9ae" />
      )))}
    </svg>
  );
}
function Dropper() {
  return (
    <svg viewBox="0 0 48 80" width="100%" height="100%" aria-hidden>
      <rect x="18" y="2" width="12" height="16" rx="5" fill="#2f9e8f" />
      <rect x="15" y="16" width="18" height="8" rx="2" fill="#fff" stroke="#9bc9d2" />
      <rect x="8" y="24" width="32" height="52" rx="9" fill="#cfeaf0" stroke="#8cc3cd" />
      <rect x="13" y="42" width="22" height="20" rx="3" fill="#fff" />
    </svg>
  );
}
function Tube() {
  return (
    <svg viewBox="0 0 48 84" width="100%" height="100%" aria-hidden>
      <rect x="8" y="2" width="32" height="10" rx="3" fill="#2f9e8f" />
      <path d="M10 12h28l-3 62H13z" fill="#fff" stroke="#9bc9d2" />
      <path d="M13 74h22v6H13z" fill="#cfeaf0" stroke="#9bc9d2" />
      <path d="M24 30v16M16 38h16" stroke="#2f9e8f" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

const ITEMS = [
  { C: Jar, w: 58, h: 72, dx: -112, rise: 150, rot: -10, delay: 0 },
  { C: Blister, w: 72, h: 58, dx: -38, rise: 205, rot: 8, delay: 0.1 },
  { C: Dropper, w: 44, h: 74, dx: 40, rise: 160, rot: -6, delay: 0.2 },
  { C: Tube, w: 44, h: 78, dx: 112, rise: 215, rot: 12, delay: 0.3 },
] as const;

const LABEL_TILE = ["MedNeed", "Genuine", "Verified"];

// Delivery route (viewBox 0 0 800 240)
const ROUTE = "M30 190 C150 196 200 110 330 128 S520 210 640 160";

export function StoreHero() {
  const root = useRef<HTMLElement>(null);
  const route = useRef<SVGPathElement>(null);
  const rider = useRef<SVGGElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.setAttribute("data-static", "");
      return;
    }

    let raf = 0;
    let last = "";
    const flags = { v1: "", v2: "", v3: "", v4: "", drop: "", done: "" };
    let scene = "";
    const setFlag = (k: keyof typeof flags, on: boolean) => {
      const v = on ? "1" : "0";
      if (flags[k] !== v) {
        flags[k] = v;
        el.dataset[k] = v;
      }
    };

    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const travel = Math.max(1, r.height - window.innerHeight);
      const p = clamp01(-r.top / travel);

      const o1 = 1 - win(0.17, 0.27, p);
      const o2 = win(0.24, 0.33, p) * (1 - win(0.5, 0.58, p));
      const o3 = win(0.52, 0.6, p) * (1 - win(0.75, 0.83, p));
      const o4 = win(0.78, 0.87, p);
      const lid = ease(win(0.3, 0.38, p));
      const rise = ease(win(0.34, 0.5, p));
      const spin = win(0.55, 0.77, p);
      const ride = win(0.84, 0.97, p);
      const ph = win(0, 0.3, p);

      const key = [o1, o2, o3, o4, lid, rise, spin, ride, ph].map(f3).join("|");
      if (key !== last) {
        last = key;
        const s = el.style;
        s.setProperty("--o1", f3(o1));
        s.setProperty("--o2", f3(o2));
        s.setProperty("--o3", f3(o3));
        s.setProperty("--o4", f3(o4));
        s.setProperty("--lid", f3(lid));
        s.setProperty("--rise", f3(rise));
        s.setProperty("--spin", f3(spin));
        s.setProperty("--ph", f3(ph));
        s.setProperty("--c1", f3(win(0.1, 0.3, spin)));
        s.setProperty("--c2", f3(win(0.38, 0.58, spin)));
        s.setProperty("--c3", f3(win(0.66, 0.86, spin)));
        s.setProperty("--prog", f3(p));
        const dom = o1 >= Math.max(o2, o3, o4) ? "1" : o2 >= Math.max(o3, o4) ? "2" : o3 >= o4 ? "3" : "4";
        if (dom !== scene) { scene = dom; el.dataset.scene = dom; }
        setFlag("v1", o1 > 0.02);
        setFlag("v2", o2 > 0.02);
        setFlag("v3", o3 > 0.02);
        setFlag("v4", o4 > 0.02);
        setFlag("drop", ride >= 0.99);
        setFlag("done", ride >= 0.99 && p >= 0.985);

        const path = route.current, g = rider.current;
        if (path && g) {
          const len = path.getTotalLength();
          const d = ride * len;
          const a = path.getPointAtLength(d);
          const b = path.getPointAtLength(Math.min(len, d + 2));
          const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
          g.setAttribute("transform", `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${(deg * 0.55).toFixed(1)})`);
        }
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={root} id="mn-cine" data-tone="light" aria-labelledby="ms-title" className={`ms ${heroSerif.variable}`} data-scene="1" data-v1="1" data-v2="0" data-v3="0" data-v4="0">
      <div className="ms-stage">
        <div className="ms-bg" aria-hidden />

        {/* Product scene (right side): drifts up and away as the story moves on */}
        <div className="ms-prod" aria-hidden>
          <div className="ms-prod-in">
            <Image src="/hero/medicine-podium-fade.webp" alt="" fill priority sizes="(max-width: 900px) 112vw, 60vw" quality={85} className="ms-prod-img" />
          </div>
        </div>

        {/* Scene 1: entrance + headline */}
        <div className="ms-scene ms-s1">
          <div className="ms-copy">
            <h1 id="ms-title" className="ms-title">
              <span className="ms-line"><span className="ms-line-in" style={{ "--d": "450ms" } as CSSProperties}>Your trusted medicine store,</span></span>
              <span className="ms-line"><span className="ms-line-in" style={{ "--d": "650ms" } as CSSProperties}>
                <em className="ms-em">delivered<svg className="ms-swash" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden focusable="false"><path pathLength={1} d="M3 10.5C38 4 86 2.5 128 5.5c26 1.9 48 4.6 68-1.5" /></svg></em> to your door.
              </span></span>
            </h1>
            <p className="ms-sub ms-in" style={{ "--d": "900ms" } as CSSProperties}>
              Genuine medicines, wellness and personal care, checked by a registered pharmacist and brought to you between 7&nbsp;AM and 10&nbsp;PM.
            </p>
            <div className="ms-actions ms-in" style={{ "--d": "1050ms" } as CSSProperties}>
              <Link href="/medicines" className="ms-btn ms-btn-primary group">
                <span className="ms-l-long">Order medicines</span><span className="ms-l-short">Order now</span> <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link href="/account/prescriptions/new" className="ms-btn ms-btn-ghost">
                <Upload className="h-4 w-4" aria-hidden /> <span className="ms-l-long">Upload prescription</span><span className="ms-l-short">Upload Rx</span>
              </Link>
            </div>
            <ul className="ms-points ms-in" style={{ "--d": "1200ms" } as CSSProperties}>
              <li><ShieldCheck aria-hidden /><span>Genuine medicines</span></li>
              <li><Truck aria-hidden /><span>Free delivery over ₹499</span></li>
              <li><UserCheck aria-hidden /><span>Pharmacist verified</span></li>
            </ul>
          </div>
        </div>

        {/* Scene 2: unboxing */}
        <div className="ms-scene ms-s2" aria-hidden>
          <p className="ms-cap"><span>Step 2</span> Packed with care</p>
          <div className="ms-box">
            <div className="ms-box-shadow" />
            <div className="ms-lid"><i /></div>
            <div className="ms-inside" />
            <div className="ms-items">
              {ITEMS.map(({ C, w, h, dx, rise, rot, delay }, i) => (
                <div key={i} className="ms-item" style={{ "--w": `${w}px`, "--h": `${h}px`, "--dx": `${dx}px`, "--rs": `${rise}px`, "--rot": `${rot}deg`, "--fd": `${delay * 5}s` } as CSSProperties}>
                  <div className="ms-item-in"><C /></div>
                </div>
              ))}
            </div>
            <div className="ms-front">
              <span className="ms-tape" />
              <span className="ms-front-mark"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" fill="#16a34a" /></svg> MedNeed</span>
              <span className="ms-front-sub">Sealed · Pharmacist checked</span>
            </div>
          </div>
        </div>

        {/* Scene 3: product spotlight */}
        <div className="ms-scene ms-s3" aria-hidden>
          <p className="ms-cap"><span>Step 3</span> Genuine, every time</p>
          <div className="ms-spot">
            <span className="ms-pill ms-pill-1"><Pill className="h-4 w-4" /> Medicines</span>
            <span className="ms-pill ms-pill-2"><Leaf className="h-4 w-4" /> Wellness</span>
            <span className="ms-pill ms-pill-3"><Heart className="h-4 w-4" /> Personal Care</span>
            <span className="ms-spark"><Sparkles className="h-5 w-5" /></span>
            <div className="ms-bottle">
              <div className="ms-bcap" />
              <div className="ms-bneck" />
              <div className="ms-bbody">
                <div className="ms-blabel">
                  <div className="ms-btrack">
                    {[0, 1].flatMap((k) => LABEL_TILE.map((t, i) => (
                      <span key={`${k}${i}`}>{i === 0 ? <b>+</b> : null}{t}</span>
                    )))}
                  </div>
                </div>
                <div className="ms-bshade" />
              </div>
            </div>
            <div className="ms-podium"><i /></div>
          </div>
        </div>

        {/* Scene 4: delivery */}
        <div className="ms-scene ms-s4">
          <p className="ms-cap" aria-hidden><span>Step 4</span> Out for delivery</p>
          <div className="ms-route" aria-hidden>
            <svg viewBox="0 0 800 240" preserveAspectRatio="xMidYMid meet" focusable="false">
              <path d={ROUTE} fill="none" stroke="#d9eef2" strokeWidth="26" strokeLinecap="round" />
              <path ref={route} d={ROUTE} fill="none" stroke="#7fb9c4" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" />
              {/* doorstep */}
              <g transform="translate(655 72)">
                <rect x="0" y="34" width="96" height="62" rx="4" fill="#fff" stroke="#9bc9d2" />
                <path d="M-8 36 L48 -4 L104 36Z" fill="#2f9e8f" />
                <rect x="38" y="58" width="20" height="38" rx="2" fill="#8fd0d8" />
                <rect x="10" y="50" width="18" height="16" rx="2" fill="#e5f6f9" stroke="#9bc9d2" />
                <rect x="68" y="50" width="18" height="16" rx="2" fill="#e5f6f9" stroke="#9bc9d2" />
              </g>
              <g className="ms-pin" transform="translate(706 180)">
                <g className="ms-pin-in">
                  <ellipse className="ms-pin-ring" cx="0" cy="22" rx="22" ry="7" />
                  <path d="M0 22 C-16 -2 -18 -8 -18 -16 a18 18 0 1 1 36 0 c0 8 -2 14 -18 38z" fill="#16a34a" />
                  <circle cx="0" cy="-16" r="7" fill="#fff" />
                </g>
              </g>
              <g ref={rider} transform="translate(30 190)">
                <g transform="translate(-34 -44)">
                  <ellipse cx="34" cy="44" rx="34" ry="5" fill="rgb(15 61 70 / .18)" />
                  <circle cx="12" cy="36" r="8" fill="#23424a" /><circle cx="12" cy="36" r="3" fill="#cfe3e7" />
                  <circle cx="58" cy="36" r="8" fill="#23424a" /><circle cx="58" cy="36" r="3" fill="#cfe3e7" />
                  <path d="M12 36 L26 36 L32 22 L50 22 L58 36" fill="none" stroke="#2f9e8f" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M52 22 L56 8 L64 8" fill="none" stroke="#23424a" strokeWidth="3.5" strokeLinecap="round" />
                  <rect x="22" y="-2" width="24" height="22" rx="3" fill="#fff" stroke="#9bc9d2" strokeWidth="1.5" />
                  <path d="M34 3h4v5h5v4h-5v5h-4v-5h-5V8h5z" fill="#16a34a" />
                </g>
              </g>
            </svg>
            <div className="ms-done">
              <span className="ms-done-ic"><Check className="h-4 w-4" /></span>
              <span><b>Delivered</b><small>Order #MN-2041 · in 18 min</small></span>
            </div>
          </div>
          <div className="ms-s4-copy">
            <h2 className="ms-s4-title">From our shelf to <em>your doorstep.</em></h2>
            <div className="ms-actions">
              <Link href="/medicines" className="ms-btn ms-btn-primary group">
                Order medicines <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link href="/account/prescriptions/new" className="ms-btn ms-btn-ghost">
                <Upload className="h-4 w-4" aria-hidden /> Upload prescription
              </Link>
            </div>
          </div>
        </div>

        {/* Progress + skip (one bar, so they always line up; on desktop the bar steps aside and each sits in its own corner) */}
        <div className="ms-bar">
          <a href="#after-hero" className="ms-skip">Skip intro <ArrowRight className="h-3.5 w-3.5" aria-hidden /></a>
          <ol className="ms-dots" aria-hidden>
            {[1, 2, 3, 4].map((n) => (
              <li key={n} style={{ "--n": n } as CSSProperties} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
