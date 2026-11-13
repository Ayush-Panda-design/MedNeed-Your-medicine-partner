"use client";

import { useEffect } from "react";

/**
 * A small library of button click effects. Mounted once; buttons opt in with a data-fx attribute:
 *   data-fx="ripple"  — a material-style ripple spreads from the click point
 *   data-fx="pop"     — a springy squash-and-pop
 *   data-fx="pulse"   — a ring radiates outward from the edge
 *   data-fx="shine"   — a light streak sweeps across
 *   data-fx="jelly"   — a playful wobble that settles
 * Ripple and shine also need the matching class (mn-fx-ripple / mn-fx-shine) for clipping.
 * Everything is purely visual and never interferes with the button's own click handler.
 */
export function ButtonFx() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const runClass = (el: HTMLElement, cls: string, ms: number) => {
      el.classList.remove(cls);
      void el.offsetWidth; // restart the animation
      el.classList.add(cls);
      window.setTimeout(() => el.classList.remove(cls), ms);
    };

    const onDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement)?.closest?.("[data-fx]") as HTMLElement | null;
      if (!el) return;
      const fx = el.getAttribute("data-fx") ?? "";
      const rect = el.getBoundingClientRect();

      if (fx.includes("ripple")) {
        const d = Math.max(rect.width, rect.height);
        const s = document.createElement("span");
        s.className = "mn-ripple";
        s.style.width = s.style.height = `${d}px`;
        s.style.left = `${e.clientX - rect.left - d / 2}px`;
        s.style.top = `${e.clientY - rect.top - d / 2}px`;
        el.appendChild(s);
        s.addEventListener("animationend", () => s.remove());
      }
      if (fx.includes("pulse")) {
        const s = document.createElement("span");
        s.className = "mn-pulsering";
        el.appendChild(s);
        s.addEventListener("animationend", () => s.remove());
      }
      if (fx.includes("pop")) runClass(el, "mn-pop-run", 420);
      if (fx.includes("jelly")) runClass(el, "mn-jelly-run", 520);
      if (fx.includes("shine")) runClass(el, "mn-shine-run", 650);
    };

    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  return null;
}
