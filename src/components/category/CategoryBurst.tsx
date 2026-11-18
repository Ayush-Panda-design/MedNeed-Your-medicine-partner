"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import "./burst.css";

/*
 * "Pill popper" entrance for the category grid: when the grid scrolls into view a capsule pops up in its middle and
 * the tiles shoot out of it into their places, then the capsule vanishes. About one second in total, plays once.
 * Pure transform/opacity. With reduced motion (or before this runs) the grid is simply shown.
 */
export function CategoryBurst({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const cap = useRef<HTMLSpanElement>(null);

  // Set the tiles' starting positions before the first paint so they never flash in place first.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>(":scope > ul > li"));
    if (!items.length) return;
    const box = el.getBoundingClientRect();
    const ox = box.left + box.width / 2;
    const oy = box.top + Math.min(box.height / 2, 240);
    if (cap.current) cap.current.style.top = `${oy - box.top}px`;
    items.forEach((li, i) => {
      const r = li.getBoundingClientRect();
      li.style.setProperty("--dx", `${Math.round(ox - (r.left + r.width / 2))}px`);
      li.style.setProperty("--dy", `${Math.round(oy - (r.top + r.height / 2))}px`);
      li.style.setProperty("--rot", `${((i * 67) % 50) - 25}deg`);
      li.style.setProperty("--bi", String(i));
    });
    el.classList.add("cb-ready");
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || !el.classList.contains("cb-ready")) return;
    const go = () => {
      el.classList.add("cb-go");
      // Drop the hidden-state rules once everything has landed.
      window.setTimeout(() => el.classList.remove("cb-ready", "cb-go"), 1600);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          go();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={root} className="cb">
      {children}
      <span ref={cap} className="cb-cap" aria-hidden>
        <svg viewBox="0 0 64 64" width="56" height="56">
          <g transform="rotate(-40 32 32)">
            <rect x="8" y="20" width="48" height="24" rx="12" fill="#fff" />
            <path d="M32 20h12a12 12 0 0 1 0 24H32z" fill="#16a34a" />
            <rect x="8" y="20" width="48" height="24" rx="12" fill="none" stroke="#0f766e" strokeWidth="2.5" />
            <path d="M32 20v24" stroke="#0f766e" strokeWidth="2.5" />
            <path d="M16 27h10" stroke="#cfeaf0" strokeWidth="3" strokeLinecap="round" />
          </g>
        </svg>
        <i /><i /><i /><i /><i /><i />
      </span>
    </div>
  );
}
