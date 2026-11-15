"use client";

import { useEffect } from "react";

/**
 * Mouse-follow spotlight for cards marked data-spot: sets --sx/--sy (pointer position inside the element, px),
 * which CSS uses to place a soft glow. Mounted once. Only on devices with a real mouse (no effect on phones,
 * tablets or with reduced motion), one passive listener, at most one style write per frame.
 */
export function PointerFx() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    document.documentElement.classList.add("mn-fine");

    let raf = 0;
    let last: { el: HTMLElement; x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-spot]") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      last = { el, x: e.clientX - r.left, y: e.clientY - r.top };
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (!last) return;
          last.el.style.setProperty("--sx", `${Math.round(last.x)}px`);
          last.el.style.setProperty("--sy", `${Math.round(last.y)}px`);
        });
      }
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("mn-fine");
    };
  }, []);
  return null;
}
