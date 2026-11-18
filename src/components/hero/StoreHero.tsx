"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Heart, Leaf, Pill, ShieldCheck, Sparkles, Truck, Upload, UserCheck } from "lucide-react";
import { heroSerif } from "@/lib/fonts";
import "./store-hero.css";

/*
 * Homepage hero: a calm pharmacy-shelf photo that turns into a short scroll story told by ONE medicine, the white jar with
 * the green cross from the photo:
 *   Scene 1  Entrance      the jar stands in the product photo; the headline reveals line by line
 *   Scene 2  Unboxing      the jar leaves the photo, is packed into the box, the box is sealed, then opened and the jar rises out
 *   Scene 3  Spotlight     the same jar sits on the podium while category labels appear (Medicines, Wellness, Personal Care)
 *   Scene 4  Delivery      the same jar is loaded into the scooter's crate, rides the route and is set down at the doorstep
 *
 * The stage is sticky inside a tall section. Scroll position (0..1) becomes a few CSS variables (scene opacities, box lid, ...)
 * and, for the jar, a position measured each frame from the real elements it travels between, so it lines up at any screen size.
 * Reduced motion: no scroll story, the section is a normal-height static hero (scene 1 only, no jar overlay).
 */

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const win = (a: number, b: number, p: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const f3 = (n: number) => n.toFixed(3);

type Pt = { x: number; y: number; h: number };
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, h: a.h + (b.h - a.h) * t });

/** The hero jar, drawn to match the jar in the photo: white ribbed cap, white body, green cross, a slow light sheen. */
function HeroJar() {
  return (
    <svg viewBox="0 0 100 135" aria-hidden focusable="false">
      <defs>
        <linearGradient id="hj-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.65" stopColor="#f3f6f6" />
          <stop offset="1" stopColor="#dde5e6" />
        </linearGradient>
        <linearGradient id="hj-cap" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e4eaeb" />
        </linearGradient>
        <linearGradient id="hj-cross" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1fa56d" />
          <stop offset="1" stopColor="#0f7a4c" />
        </linearGradient>
        <clipPath id="hj-clip"><rect x="8" y="24" width="84" height="107" rx="18" /></clipPath>
      </defs>
      <rect x="8" y="24" width="84" height="107" rx="18" fill="url(#hj-body)" stroke="#d6dfe1" />
      <rect x="22" y="2" width="56" height="22" rx="5" fill="url(#hj-cap)" stroke="#d6dfe1" />
      {[28, 33, 38, 43, 48, 53, 58, 63, 68, 73].map((x) => <line key={x} x1={x} y1="5" x2={x} y2="21" stroke="#dbe3e5" strokeWidth="1.2" />)}
      <rect x="26" y="21" width="48" height="6" rx="2" fill="#eef2f3" />
      <ellipse cx="30" cy="42" rx="12" ry="6" fill="#fff" opacity=".75" />
      <path d="M40 58h20v10h10v20H60v10H40V88H30V68h10z" fill="url(#hj-cross)" stroke="#0e6f45" strokeWidth=".6" strokeLinejoin="round" />
      <g clipPath="url(#hj-clip)"><g className="ms-sheen"><rect x="-8" y="20" width="14" height="116" fill="#fff" opacity=".5" transform="skewX(-14)" /></g></g>
    </svg>
  );
}

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

    const stage = el.querySelector<HTMLElement>(".ms-stage");
    const prodBox = el.querySelector<HTMLElement>(".ms-prod-box");
    const jar = el.querySelector<HTMLElement>(".ms-jar");
    const jarIn = el.querySelector<HTMLElement>(".ms-jar-in");
    const front = el.querySelector<HTMLElement>(".ms-front");
    const podium = el.querySelector<HTMLElement>(".ms-podium");
    const crate = el.querySelector<SVGGraphicsElement>("[data-crate]");
    const door = el.querySelector<SVGGraphicsElement>("[data-door]");

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

    /** Places the hero jar for scroll position p, from where the things it travels between actually are right now. */
    const placeJar = (p: number) => {
      if (!stage || !prodBox || !jar || !jarIn || !front || !podium || !crate || !door) return;
      const sr = stage.getBoundingClientRect();
      const box = (r: DOMRect) => ({ x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height, cx: r.left - sr.left + r.width / 2 });

      const pb = box(prodBox.getBoundingClientRect());
      const A: Pt = { x: pb.x + pb.w * 0.406, y: pb.y + pb.h * 0.55, h: pb.h * 0.575 }; // the jar in the photo
      const F = box(front.getBoundingClientRect()); // the box's front panel
      const hb = Math.max(60, F.h * 0.86);
      const C0: Pt = { x: F.cx, y: F.y - hb / 2 - 14, h: hb }; // hovering over the open box
      const B: Pt = { x: F.cx, y: F.y + hb / 2 + 12, h: hb }; // inside the box, out of sight
      const C1: Pt = { x: F.cx, y: F.y - hb / 2 - 48, h: hb }; // risen out of the opened box
      const Pd = box(podium.getBoundingClientRect());
      const hs = Math.max(70, Pd.w * 0.88);
      const S: Pt = { x: Pd.cx, y: Pd.y + Pd.h * 0.34 - hs / 2, h: hs }; // standing on the podium
      const cr = box(crate.getBoundingClientRect());
      const hr = Math.max(26, cr.w * 1.9);
      const R: Pt = { x: cr.cx, y: cr.y + cr.h * 0.45 - hr / 2, h: hr }; // packed in the scooter's crate
      const crateClip = cr.y + cr.h * 0.4;
      const dr = box(door.getBoundingClientRect());
      const hd = Math.max(30, dr.h * 1.15);
      const D: Pt = { x: dr.cx, y: dr.y + dr.h + 3 - hd / 2, h: hd }; // standing at the door

      let pt = A;
      let clip: number | null = null;
      let tilt = 0;
      const arc = (t: number, k: number) => Math.sin(Math.PI * t) * k;
      if (p < 0.05) pt = A;
      else if (p < 0.15) {
        const t = ease(win(0.05, 0.15, p));
        pt = lerp(A, C0, t);
        pt = { ...pt, y: pt.y - arc(t, pt.h * 0.3) };
        tilt = -arc(t, 10);
      } else if (p < 0.21) {
        pt = lerp(C0, B, ease(win(0.15, 0.21, p)));
        clip = F.y;
      } else if (p < 0.3) {
        pt = B;
        clip = F.y;
      } else if (p < 0.42) {
        const t = ease(win(0.3, 0.4, p));
        pt = lerp(B, C1, t);
        clip = F.y;
        tilt = arc(t, 5);
      } else if (p < 0.52) {
        const t = ease(win(0.42, 0.52, p));
        pt = lerp(C1, S, t);
        pt = { ...pt, y: pt.y - arc(t, pt.h * 0.18) };
        tilt = arc(t, -6);
      } else if (p < 0.64) pt = S;
      else if (p < 0.76) {
        const t = ease(win(0.64, 0.76, p));
        pt = lerp(S, R, t);
        pt = { ...pt, y: pt.y - arc(t, S.h * 0.25) };
        clip = lerp({ x: 0, y: sr.height + 400, h: 0 }, { x: 0, y: crateClip, h: 0 }, ease(win(0.6, 1, t))).y;
        tilt = arc(t, 12);
      } else if (p < 0.95) {
        pt = R;
        clip = crateClip;
      } else {
        const t = ease(win(0.95, 0.99, p));
        pt = lerp(R, D, t);
        pt = { ...pt, y: pt.y - arc(t, R.h * 0.8) };
        clip = t < 0.35 ? crateClip : null;
        tilt = arc(t, 8);
      }

      const s = pt.h / 135;
      jar.style.opacity = f3(win(0.02, 0.05, p));
      jar.style.transform = `translate3d(${(pt.x - 50).toFixed(1)}px, ${(pt.y - 67.5).toFixed(1)}px, 0) rotate(${tilt.toFixed(1)}deg) scale(${s.toFixed(3)})`;
      const hide = clip === null ? 0 : Math.max(0, (pt.y + pt.h / 2 - clip) / s);
      jarIn.style.clipPath = clip === null ? "none" : `inset(0 0 ${Math.min(hide, 140).toFixed(1)}px 0)`;
    };

    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const travel = Math.max(1, r.height - window.innerHeight);
      const p = clamp01(-r.top / travel);

      // One continuous timeline. Neighbouring scenes overlap and hand over to each other, and one jar runs through all of it:
      //   .02-.15  the jar leaves the photo and heads for the box, which rises and opens
      //   .15-.30  it sinks into the box, the box is sealed
      //   .30-.42  the box opens again and the jar rises out
      //   .42-.52  the jar moves to the podium (spotlight)
      //   .64-.76  the jar is loaded into the scooter's crate
      //   .78-.95  the scooter rides the route
      //   .95-.99  the jar is set down at the door
      const x12 = ease(win(0.06, 0.18, p));
      const x23 = ease(win(0.4, 0.52, p));
      const x34 = ease(win(0.64, 0.76, p));
      const op = 1 - win(0.05, 0.14, p); // the photo's other objects fade once the jar has left it
      const o1 = 1 - win(0.1, 0.18, p);
      const o2 = win(0.1, 0.18, p) * (1 - win(0.44, 0.52, p));
      const o3 = win(0.44, 0.52, p) * (1 - win(0.7, 0.78, p));
      const o4 = win(0.68, 0.76, p);
      // The lid: opens as the box arrives, closes over the jar, opens again to let it out.
      const lid = p < 0.22 ? ease(win(0.08, 0.14, p)) : p < 0.3 ? 1 - ease(win(0.22, 0.27, p)) : ease(win(0.3, 0.35, p));
      const spin = win(0.5, 0.68, p);
      const ride = win(0.78, 0.95, p);

      const key = [o1, o2, o3, o4, op, lid, spin, ride, x12, x23, x34].map(f3).join("|");
      if (key !== last) {
        last = key;
        const s = el.style;
        s.setProperty("--o1", f3(o1));
        s.setProperty("--o2", f3(o2));
        s.setProperty("--o3", f3(o3));
        s.setProperty("--o4", f3(o4));
        s.setProperty("--op", f3(op));
        s.setProperty("--lid", f3(lid));
        s.setProperty("--spin", f3(spin));
        s.setProperty("--x12", f3(x12));
        s.setProperty("--x23", f3(x23));
        s.setProperty("--x34", f3(x34));
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
        placeJar(p); // last: it measures things that the lines above have just moved
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onResize = () => { last = ""; onScroll(); }; // a new screen size moves everything the jar is measured against
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={root} id="mn-cine" data-tone="light" aria-labelledby="ms-title" className={`ms ${heroSerif.variable}`} data-scene="1" data-v1="1" data-v2="0" data-v3="0" data-v4="0">
      <div className="ms-stage">
        <div className="ms-bg" aria-hidden />

        {/* Product scene (right side). The box fixes where it sits; the scene inside it is what packs away and fades */}
        <div className="ms-prod-box" aria-hidden>
          <div className="ms-prod">
            <div className="ms-prod-in">
              <Image src="/hero/medicine-podium-fade.webp" alt="" fill priority sizes="(max-width: 900px) 112vw, 60vw" quality={85} className="ms-prod-img" />
            </div>
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

        {/* Scene 2: packing and unboxing (the jar itself is the layer further down) */}
        <div className="ms-scene ms-s2" aria-hidden>
          <p className="ms-cap"><span>Step 2</span> Packed with care</p>
          <div className="ms-box">
            <div className="ms-box-shadow" />
            <div className="ms-lid"><i /></div>
            <div className="ms-inside" />
            <div className="ms-front">
              <span className="ms-tape" />
              <span className="ms-front-mark"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" fill="#16a34a" /></svg> MedNeed</span>
              <span className="ms-front-sub">Sealed · Pharmacist checked</span>
            </div>
          </div>
        </div>

        {/* Scene 3: spotlight (the jar stands on the podium) */}
        <div className="ms-scene ms-s3" aria-hidden>
          <p className="ms-cap"><span>Step 3</span> Genuine, every time</p>
          <div className="ms-spot">
            <span className="ms-pill ms-pill-1"><Pill className="h-4 w-4" /> Medicines</span>
            <span className="ms-pill ms-pill-2"><Leaf className="h-4 w-4" /> Wellness</span>
            <span className="ms-pill ms-pill-3"><Heart className="h-4 w-4" /> Personal Care</span>
            <span className="ms-spark"><Sparkles className="h-5 w-5" /></span>
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
                <rect data-door x="38" y="58" width="20" height="38" rx="2" fill="#8fd0d8" />
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
                  {/* the crate the jar is packed into */}
                  <rect data-crate x="20" y="4" width="28" height="18" rx="3" fill="#16a34a" stroke="#0f7a4c" strokeWidth="1.2" />
                  <path d="M34 8h3v4h4v3h-4v4h-3v-4h-4v-3h4z" fill="#fff" opacity=".9" />
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

        {/* The one medicine that is in every scene */}
        <div className="ms-jar" aria-hidden>
          <div className="ms-jar-in"><HeroJar /></div>
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
