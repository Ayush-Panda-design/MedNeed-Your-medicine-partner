"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { BadgeCheck, BellRing, MapPin, RotateCcw, UserCheck } from "lucide-react";
import "./promise.css";

/**
 * "The MedNeed promise": four short, interactive illustrated stories — fast delivery, genuine medicines,
 * pharmacist-checked orders and medicine reminders. Original SVG art; CSS transform/opacity animation.
 * Autoplays through the stories while on screen (paused off screen, on hover and once the visitor interacts);
 * every story also has something to try. Reduced motion: still, finished scenes and no autoplay.
 */

const STORIES = [
  { key: "fast", icon: MapPin, title: "Fast delivery", line: "Our own riders deliver across a 15 km radius of Bhubaneswar.", hint: "Tap the map to choose your home" },
  { key: "genuine", icon: BadgeCheck, title: "Genuine medicines", line: "Sourced only from licensed distributors. Batch and expiry checked on every strip.", hint: "Move the magnifier over the batch number" },
  { key: "checked", icon: UserCheck, title: "Pharmacist-checked", line: "A registered pharmacist reviews every prescription order before it leaves the store.", hint: "Tap each medicine to check it yourself" },
  { key: "track", icon: BellRing, title: "Stay on track", line: "Free medicine reminders on your phone, so you never miss a dose.", hint: "Tap “Taken” on the reminder" },
] as const;

const SLIDE_MS = 9000;

function usePrefersReduced() {
  const [r, setR] = useState(false);
  useEffect(() => setR(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return r;
}

/** Converts a pointer position to the scene's 400×260 drawing coordinates. */
function toScene(svg: SVGSVGElement | null, e: { clientX: number; clientY: number }) {
  if (!svg) return null;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

/* ───────────── 1. Fast delivery: tap the map, a rider takes the route ───────────── */
const SHOP = { x: 150, y: 172 };
const RADIUS = 140; // drawing units = 15 km
function FastScene({ reduced, onInteract }: { reduced: boolean; onInteract: () => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const [dest, setDest] = useState({ x: 262, y: 92 });
  const [run, setRun] = useState(0);
  const d = Math.hypot(dest.x - SHOP.x, dest.y - SHOP.y);
  const km = (d * 15) / RADIUS;
  const inside = d <= RADIUS;
  const mx = (SHOP.x + dest.x) / 2;
  const route = `M${SHOP.x} ${SHOP.y} C${mx} ${SHOP.y} ${mx} ${dest.y} ${dest.x} ${dest.y}`;

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const p = toScene(svg.current, e);
    if (!p) return;
    onInteract();
    setDest({ x: Math.min(372, Math.max(28, p.x)), y: Math.min(232, Math.max(p.x < 236 ? 96 : 52, p.y)) });
    setRun((n) => n + 1);
  };

  return (
    <svg ref={svg} viewBox="0 0 400 260" className="ps-svg ps-tap" onPointerDown={pick} role="img" aria-label={`Delivery route, about ${km.toFixed(1)} km`}>
      <rect width="400" height="260" rx="18" fill="#eef8f0" />
      {/* city blocks, river, parks */}
      <path d="M0 214 C80 196 120 238 210 222 S330 186 400 206 V260 H0Z" fill="#d6ecf7" />
      {[[22, 26, 70, 40], [110, 20, 58, 52], [300, 22, 76, 34], [24, 92, 52, 58], [300, 120, 74, 44], [196, 160, 64, 36], [100, 110, 30, 30]].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="7" fill="#dcefe1" />
      ))}
      {[[86, 60], [270, 70], [44, 176], [352, 92], [236, 40]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="7" fill="#b5dcbd" />
      ))}
      <circle cx={SHOP.x} cy={SHOP.y} r={RADIUS} fill="none" stroke="#16a34a" strokeOpacity=".35" strokeDasharray="5 6" className="ps-radius" />
      <text x={SHOP.x - 30} y={SHOP.y - RADIUS + 16} className="ps-tiny" fill="#15803d">15 km</text>

      <g key={`r${run}`}>
        <path d={route} fill="none" stroke="#b9e3c3" strokeWidth="9" strokeLinecap="round" />
        <path d={route} fill="none" stroke={inside ? "#16a34a" : "#f59e0b"} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="1" pathLength={1} className="ps-route" />
        {/* rider follows the route */}
        <g className="ps-rider" style={{ offsetPath: `path("${route}")` } as CSSProperties}>
          <g transform={`translate(-16 -24) ${dest.x < SHOP.x ? "scale(-1 1) translate(-32 0)" : ""}`}>
            <rect x="2" y="4" width="12" height="10" rx="2" fill="#86bb3a" />
            <path d="M6 7h4v4H6z" fill="#fff" />
            <path d="M3 18h16l4-8h4" fill="none" stroke="#0f6b33" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="7" cy="20" r="4" fill="#1f2a44" />
            <circle cx="25" cy="20" r="4" fill="#1f2a44" />
          </g>
        </g>
        {/* home */}
        <g transform={`translate(${dest.x - 15} ${dest.y - 30})`} className="ps-home">
          <ellipse cx="15" cy="31" rx="13" ry="3.5" fill="#000" opacity=".1" />
          <path d="M2 14L15 3l13 11" fill="none" stroke="#0f6b33" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 12v17h20V12" fill="#fff" stroke="#0f6b33" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="12" y="19" width="6" height="10" rx="1" className="ps-door" />
        </g>
      </g>

      {/* MedNeed pharmacy pin */}
      <g transform={`translate(${SHOP.x - 18} ${SHOP.y - 42})`}>
        <path d="M18 42C18 42 2 26 2 16a16 16 0 0 1 32 0c0 10-16 26-16 26z" fill="#15803d" />
        <circle cx="18" cy="16" r="10" fill="#fff" />
        <path d="M15.5 9h5v4.5H25v5h-4.5V23h-5v-4.5H11v-5h4.5z" fill="#16a34a" />
      </g>
      <text x={SHOP.x - 22} y={SHOP.y + 16} className="ps-tiny" fill="#14532d">MedNeed</text>

      {/* status card */}
      <g transform="translate(14 14)" key={`s${run}`}>
        <rect width="214" height="50" rx="12" fill="#fff" stroke="#e2efe5" />
        <text x="14" y="20" className="ps-small" fill="#64748b">{inside ? `About ${km.toFixed(1)} km away` : `${km.toFixed(1)} km — outside our area`}</text>
        {inside ? (
          <>
            <text x="14" y="38" className="ps-strong ps-out" fill="#0f172a">Out for delivery…</text>
            <text x="14" y="38" className="ps-strong ps-done" fill="#15803d">Delivered ✓</text>
          </>
        ) : (
          <text x="14" y="38" className="ps-strong" fill="#b45309">Call us to check</text>
        )}
      </g>
      {!reduced && <title>Tap anywhere on the map to set your home</title>}
    </svg>
  );
}

/* ───────────── 2. Genuine: a magnifier finds the batch and expiry ───────────── */
const BATCH_BOX = { x: 128, y: 150, w: 150, h: 26 };
function GenuineScene({ onInteract }: { onInteract: () => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const [manual, setManual] = useState<{ x: number; y: number } | null>(null);
  const [found, setFound] = useState(false);
  const [run, setRun] = useState(0);

  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== "mouse") return;
    const p = toScene(svg.current, e);
    if (!p) return;
    if (!manual) onInteract();
    setManual(p);
    if (p.x > BATCH_BOX.x && p.x < BATCH_BOX.x + BATCH_BOX.w && p.y > BATCH_BOX.y - 10 && p.y < BATCH_BOX.y + BATCH_BOX.h + 10) setFound(true);
  };
  const tap = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "mouse") return;
    onInteract();
    setManual(null);
    setFound(false);
    setRun((n) => n + 1);
  };
  const showProof = manual ? found : true; // autoplay reveals on its own timeline

  return (
    <svg ref={svg} viewBox="0 0 400 260" className={`ps-svg ${manual ? "ps-manual" : ""}`} onPointerMove={move} onPointerDown={tap} role="img" aria-label="A magnifier checks the batch number and expiry date on a medicine strip; it is marked genuine">
      <rect width="400" height="260" rx="18" fill="#f1f8f3" />
      <circle cx="320" cy="60" r="70" fill="#e3f4e7" />
      <g key={run}>
        {/* blister strip */}
        <g transform="rotate(-5 200 120)">
          <rect x="96" y="54" width="208" height="132" rx="14" fill="#e9eef3" stroke="#cdd6df" strokeWidth="2" />
          {[0, 1].map((r) =>
            [0, 1, 2, 3, 4].map((c) => (
              <g key={`${r}${c}`}>
                <ellipse cx={128 + c * 36} cy={84 + r * 38} rx="14" ry="11" fill="#fff" stroke="#d5dde5" strokeWidth="2" />
                <ellipse cx={128 + c * 36} cy={84 + r * 38} rx="8" ry="6" fill={c % 2 ? "#86bb3a" : "#fff7e6"} />
              </g>
            )),
          )}
          <rect x={BATCH_BOX.x - 6} y={BATCH_BOX.y - 2} width={BATCH_BOX.w + 12} height={BATCH_BOX.h} rx="6" className={`ps-glow ${manual && found ? "ps-on" : ""}`} />
          <text x={BATCH_BOX.x} y={BATCH_BOX.y + 16} className="ps-mono" fill="#334155">B.No MN2417 · EXP 08/2028</text>
        </g>

        {/* checklist */}
        {showProof && (
          <g className="ps-checks">
            {["Licensed source", "Batch checked", "Expiry checked"].map((t, i) => (
              <g key={t} transform={`translate(${16 + i * 126} 214)`} style={{ "--i": i } as CSSProperties} className="ps-chip">
                <rect width="118" height="30" rx="15" fill="#fff" stroke="#bbf7d0" />
                <circle cx="16" cy="15" r="9" fill="#16a34a" />
                <path d="M11.5 15.2l3 3 5.5-6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <text x="31" y="19" className="ps-chip-t" fill="#14532d">{t}</text>
              </g>
            ))}
          </g>
        )}

        {/* genuine seal */}
        {showProof && (
          <g className="ps-seal" transform="translate(318 66)">
            <circle r="40" fill="#16a34a" />
            <circle r="33" fill="none" stroke="#fff" strokeOpacity=".7" strokeDasharray="3 4" />
            <path d="M-11 -6l7 7 15-16" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <text y="20" textAnchor="middle" className="ps-seal-t" fill="#fff">GENUINE</text>
          </g>
        )}

        {/* magnifier */}
        <g className="ps-mag" style={manual ? ({ transform: `translate(${manual.x}px, ${manual.y}px)` } as CSSProperties) : undefined}>
          <g transform="translate(-26 -26)">
            <line x1="44" y1="44" x2="66" y2="66" stroke="#0f6b33" strokeWidth="9" strokeLinecap="round" />
            <circle cx="26" cy="26" r="25" fill="#ffffff" fillOpacity=".35" stroke="#0f6b33" strokeWidth="6" />
            <path d="M14 18a14 14 0 0 1 10-7" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>
        </g>
      </g>
    </svg>
  );
}

/* ───────────── 3. Pharmacist check: tick each medicine, the order gets approved ───────────── */
const ORDER = [
  { name: "Paracetamol 650", ok: "In stock ✓" },
  { name: "Amoxicillin 500", ok: "Prescription verified ✓", rx: true },
  { name: "Cetirizine 10", ok: "In stock ✓" },
];
function CheckedScene({ reduced, onInteract }: { reduced: boolean; onInteract: () => void }) {
  const [done, setDone] = useState<boolean[]>(() => ORDER.map(() => reduced));
  const timers = useRef<number[]>([]);
  const userDriven = useRef(false);

  useEffect(() => {
    if (reduced) return setDone(ORDER.map(() => true));
    timers.current = ORDER.map((_, i) => window.setTimeout(() => !userDriven.current && setDone((d) => d.map((v, j) => (j === i ? true : v))), 1400 + i * 1300));
    return () => timers.current.forEach(clearTimeout);
  }, [reduced]);

  const toggle = (i: number) => {
    if (!userDriven.current) {
      userDriven.current = true;
      timers.current.forEach(clearTimeout);
      setDone(ORDER.map(() => false).map((_, j) => j === i));
      onInteract();
      return;
    }
    setDone((d) => d.map((v, j) => (j === i ? !v : v)));
  };
  const key = (i: number) => (e: KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle(i));
  const all = done.every(Boolean);
  const count = done.filter(Boolean).length;

  return (
    <svg viewBox="0 0 400 260" className="ps-svg" role="group" aria-label="Pharmacist checks an order">
      <rect width="400" height="260" rx="18" fill="#f2f8f4" />
      {/* pharmacist */}
      <g transform="translate(26 54)" className={`ps-pharm ${count ? "ps-nod" : ""}`} key={count}>
        <ellipse cx="58" cy="196" rx="50" ry="7" fill="#000" opacity=".07" />
        <path d="M14 196c0-48 18-74 44-74s44 26 44 74z" fill="#fff" stroke="#d6e3da" strokeWidth="2" />
        <path d="M44 124l14 22 14-22" fill="#16a34a" />
        <path d="M58 146v50" stroke="#d6e3da" strokeWidth="2" />
        <path d="M36 132c-6 20 0 36 12 40" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
        <circle cx="48" cy="174" r="5" fill="#475569" />
        <rect x="50" y="102" width="16" height="22" rx="6" fill="#e8b48f" />
        <circle cx="58" cy="82" r="28" fill="#f2c4a0" />
        <path d="M30 80c0-22 14-32 30-32s28 12 26 30c-6-10-20-14-34-12-10 1-16 6-22 14z" fill="#2b2b3a" />
        <circle cx="48" cy="86" r="2.6" fill="#1f2937" />
        <circle cx="68" cy="86" r="2.6" fill="#1f2937" />
        <path d={all ? "M48 97q10 9 20 0" : "M50 98q8 4 16 0"} fill="none" stroke="#9a4b2f" strokeWidth="2.5" strokeLinecap="round" />
        {/* clipboard */}
        <g transform="translate(78 140) rotate(8)">
          <rect width="34" height="44" rx="5" fill="#86bb3a" />
          <rect x="4" y="6" width="26" height="34" rx="3" fill="#fff" />
          <rect x="11" y="-3" width="12" height="7" rx="2" fill="#0f6b33" />
          {[14, 21, 28].map((y, i) => (
            <path key={y} d={`M8 ${y}h${done[i] ? 18 : 10}`} stroke={done[i] ? "#16a34a" : "#cbd5e1"} strokeWidth="3" strokeLinecap="round" />
          ))}
        </g>
      </g>

      {/* order card */}
      <g transform="translate(160 22)">
        <rect width="224" height="216" rx="16" fill="#fff" stroke="#e2efe5" />
        <text x="16" y="28" className="ps-strong" fill="#0f172a">Order #MN2417</text>
        <text x="208" y="28" textAnchor="end" className="ps-small" fill="#64748b">{count}/3 checked</text>
        {ORDER.map((m, i) => (
          <g key={m.name} transform={`translate(10 ${44 + i * 52})`} className={`ps-row ${done[i] ? "ps-row-done" : ""}`} role="button" tabIndex={0} aria-pressed={done[i]} aria-label={`Check ${m.name}`} onClick={() => toggle(i)} onKeyDown={key(i)}>
            <rect width="204" height="44" rx="11" className="ps-row-bg" />
            <rect x="10" y="12" width="22" height="20" rx="6" fill={m.rx ? "#fde68a" : "#dcfce7"} />
            <text x="21" y="26.5" textAnchor="middle" className="ps-tiny" fill={m.rx ? "#92400e" : "#166534"}>{m.rx ? "Rx" : "℞"}</text>
            <text x="42" y="20" className="ps-small ps-b" fill="#0f172a">{m.name}</text>
            <text x="42" y="35" className="ps-tiny" fill={done[i] ? "#15803d" : "#94a3b8"}>{done[i] ? m.ok : m.rx ? "Needs prescription check" : "Tap to check"}</text>
            <circle cx="184" cy="22" r="11" className="ps-tick-bg" />
            <path d="M178.5 22.3l3.6 3.6 6.4-7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="ps-tick" />
          </g>
        ))}
      </g>
      {all && (
        <g className="ps-stamp" transform="translate(286 240) rotate(-6)">
          <rect x="-66" y="-17" width="132" height="34" rx="9" fill="#fff" stroke="#16a34a" strokeWidth="3" />
          <text y="6" textAnchor="middle" className="ps-stamp-t" fill="#15803d">APPROVED ✓</text>
        </g>
      )}
    </svg>
  );
}

/* ───────────── 4. Reminders: tap "Taken", the streak grows ───────────── */
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
function TrackScene({ reduced, onInteract }: { reduced: boolean; onInteract: () => void }) {
  const [taken, setTaken] = useState(reduced);
  const auto = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (reduced) return setTaken(true);
    auto.current = window.setTimeout(() => setTaken(true), 3200);
    return () => clearTimeout(auto.current);
  }, [reduced]);
  const take = () => {
    clearTimeout(auto.current);
    if (!taken) onInteract();
    setTaken((t) => !t);
  };
  const keyTake = (e: KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), take());
  const streak = taken ? 4 : 3;

  return (
    <svg viewBox="0 0 400 260" className="ps-svg" role="group" aria-label="Medicine reminder on a phone">
      <rect width="400" height="260" rx="18" fill="#f2f8f4" />
      <circle cx="96" cy="140" r="96" fill="#e3f4e7" />
      {/* phone */}
      <g transform="translate(40 18)">
        <rect width="118" height="226" rx="22" fill="#1f2a44" />
        <rect x="7" y="8" width="104" height="210" rx="16" fill="#f8fafc" />
        <rect x="42" y="14" width="34" height="7" rx="3.5" fill="#1f2a44" />
        <text x="59" y="52" textAnchor="middle" className="ps-clock" fill="#0f172a">8:00</text>
        <text x="59" y="66" textAnchor="middle" className="ps-tiny" fill="#64748b">Thursday</text>
        {/* notification */}
        <g key={taken ? "next" : "now"} className="ps-notif">
          <rect x="12" y="80" width="94" height={taken ? 52 : 92} rx="12" fill="#fff" stroke="#e2e8f0" />
          <circle cx="26" cy="96" r="8" fill="#16a34a" />
          <path d="M22.5 96h7M26 92.5v7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          <text x="38" y="94" className="ps-tiny ps-b" fill="#0f172a">MedNeed</text>
          <text x="38" y="104" className="ps-tiny" fill="#64748b">{taken ? "Next: 9:00 PM" : "now"}</text>
          <text x="20" y="122" className="ps-small ps-b" fill="#0f172a">{taken ? "Great job! 🎉" : "BP tablet"}</text>
          {!taken && (
            <>
              <g className="ps-btn" role="button" tabIndex={0} aria-label="Mark tablet as taken" onClick={take} onKeyDown={keyTake}>
                <rect x="20" y="134" width="50" height="26" rx="13" fill="#16a34a" className="ps-btn-bg" />
                <text x="45" y="151" textAnchor="middle" className="ps-small ps-b" fill="#fff">Taken</text>
              </g>
              <text x="88" y="151" textAnchor="middle" className="ps-tiny" fill="#64748b">Snooze</text>
            </>
          )}
        </g>
      </g>

      {/* week */}
      <g transform="translate(184 40)">
        <rect width="200" height="176" rx="16" fill="#fff" stroke="#e2efe5" />
        <text x="16" y="30" className="ps-strong" fill="#0f172a">This week</text>
        <g transform="translate(16 46)">
          <rect width="124" height="28" rx="14" fill="#fff7ed" />
          <text x="12" y="18.5" className="ps-small ps-b" fill="#c2410c" key={streak}>🔥 {streak}-day streak</text>
        </g>
        {DAYS.map((d, i) => {
          const isToday = i === 3;
          const filled = i < 3 || (isToday && taken);
          return (
            <g key={i} transform={`translate(${26 + i * 25} 112)`}>
              <circle r="10.5" fill={filled ? "#16a34a" : "#f1f5f9"} stroke={isToday ? "#16a34a" : "none"} strokeWidth="2" className={isToday && !taken ? "ps-today" : isToday ? "ps-pop" : ""} />
              {filled && <path d="M-4.5 0.3l3 3 5.5-6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
              <text y="28" textAnchor="middle" className="ps-tiny" fill={isToday ? "#15803d" : "#94a3b8"}>{d}</text>
              {isToday && taken && !reduced && (
                <g className="ps-burst">
                  {Array.from({ length: 8 }, (_, k) => (
                    <circle key={k} r="2.6" fill={k % 2 ? "#a3e635" : "#16a34a"} style={{ "--a": `${k * 45}deg` } as CSSProperties} />
                  ))}
                </g>
              )}
            </g>
          );
        })}
        <text x="16" y="164" className="ps-tiny" fill="#64748b">{taken ? "All doses taken today" : "1 dose due today"}</text>
      </g>
    </svg>
  );
}

/* ───────────── The section ───────────── */
export function PromiseStories() {
  const reduced = usePrefersReduced();
  const [active, setActive] = useState(0);
  const [replay, setReplay] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const [userDriven, setUserDriven] = useState(false);
  const [pulse, setPulse] = useState(0);
  const drivenRef = useRef(false);
  useEffect(() => { drivenRef.current = userDriven; }, [userDriven]);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || !("IntersectionObserver" in window)) return;
    // Each time the section comes into view, (re)start the current story so the visitor sees it play from
    // the beginning, and flash the stage so the eye goes to it.
    const io = new IntersectionObserver(([e]) => {
      setVisible(e.isIntersecting);
      if (e.isIntersecting && !drivenRef.current) {
        setReplay((n) => n + 1);
        setPulse((n) => n + 1);
      }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = tabsRef.current;
    const tab = row?.children[active] as HTMLElement | undefined;
    if (row && tab && row.scrollWidth > row.clientWidth) row.scrollTo({ left: tab.offsetLeft - 8, behavior: reduced ? "auto" : "smooth" });
  }, [active, reduced]);

  const autoplay = visible && !hover && !userDriven && !reduced;
  const next = useCallback(() => setActive((a) => (a + 1) % STORIES.length), []);
  const choose = (i: number) => {
    setUserDriven(true);
    setActive(i);
    setReplay((n) => n + 1);
  };
  const interact = useCallback(() => setUserDriven(true), []);
  const s = STORIES[active];

  const scene = (() => {
    const props = { reduced, onInteract: interact };
    switch (s.key) {
      case "fast": return <FastScene {...props} />;
      case "genuine": return <GenuineScene onInteract={interact} />;
      case "checked": return <CheckedScene {...props} />;
      default: return <TrackScene {...props} />;
    }
  })();

  return (
    <section ref={root} aria-labelledby="ps-title" className="ps-section mx-auto mt-14 max-w-7xl px-4 sm:px-6">
      <div className="ps-wrap" onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)} onPointerLeave={() => setHover(false)}>
        <div className="ps-head">
          <span className="inline-flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-teal-600">
            <span aria-hidden className="h-[2px] w-6 rounded-full bg-gradient-to-r from-teal-600 to-lime-400" /> The MedNeed promise
          </span>
          <h2 id="ps-title" className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Fast, genuine, checked — and there for you</h2>
          <p className="mt-1 text-sm text-ink-2">Four promises, shown rather than told. Try each one.</p>
        </div>

        <div className="ps-grid">
          {/* tabs */}
          <div ref={tabsRef} role="tablist" aria-label="Our promises" className="ps-tabs">
            {STORIES.map((t, i) => {
              const on = i === active;
              return (
                <button
                  key={t.key}
                  role="tab"
                  id={`ps-tab-${t.key}`}
                  aria-selected={on}
                  aria-controls="ps-stage"
                  className={`ps-tab ${on ? "ps-tab-on" : ""}`}
                  onClick={() => choose(i)}
                >
                  <span className="ps-tab-ic"><t.icon className="h-5 w-5" aria-hidden /></span>
                  <span className="min-w-0 text-left">
                    <span className="ps-tab-title">{t.title}</span>
                    <span className="ps-tab-line">{t.line}</span>
                  </span>
                  {on && (
                    <span aria-hidden className="ps-bar">
                      <span
                        key={`${active}-${replay}`}
                        className="ps-bar-fill"
                        style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: autoplay ? "running" : "paused", opacity: autoplay ? 1 : 0 } as CSSProperties}
                        onAnimationEnd={next}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* stage */}
          <div id="ps-stage" role="tabpanel" aria-labelledby={`ps-tab-${s.key}`} className="ps-stage">
            <div className={`ps-frame ${autoplay ? "ps-frame-live" : ""}`} key={`f${pulse}`}>
              <span className="ps-now" aria-hidden>
                <span className="ps-now-dot" />
                {autoplay ? "Now playing" : "Your turn"} · {s.title}
              </span>
              <div className="ps-scene" key={`${active}-${replay}`}>{scene}</div>
            </div>
            <div className="ps-foot">
              <p className="ps-hint"><span aria-hidden className="ps-dot" /><span><span className="ps-hint-k">Try it:</span> {s.hint}</span></p>
              <div className="flex shrink-0 items-center gap-2">
                {s.key === "track" && (
                  <Link href="/account/reminders" className="ps-link">Set reminders</Link>
                )}
                <button type="button" className="ps-replay" onClick={() => { setReplay((n) => n + 1); setUserDriven(true); }} aria-label="Replay this story">
                  <RotateCcw className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            <p className="ps-mobile-line">{s.line}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
