"use client";

import { useEffect } from "react";

/**
 * Fades elements marked data-reveal up into view as they are scrolled to.
 * Mounted once on a page. The hiding only happens once this runs, so with
 * JavaScript off (or before hydration) everything is fully visible — safe for SEO.
 * An optional data-reveal-delay="120" staggers an item.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduce || !("IntersectionObserver" in window) || els.length === 0) return;

    root.classList.add("mn-reveal-ready"); // activates the "hidden until seen" CSS
    for (const el of els) {
      const d = el.getAttribute("data-reveal-delay");
      if (d) el.style.setProperty("--mn-d", `${d}ms`);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("mn-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    // Anything already on screen at load reveals immediately.
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9) el.classList.add("mn-in");
      else io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  return null;
}
