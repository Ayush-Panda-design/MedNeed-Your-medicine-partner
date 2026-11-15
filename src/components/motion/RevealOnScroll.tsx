"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELECTOR = "[data-reveal],[data-stagger],[data-words]";

/**
 * Scroll-triggered entrances, mounted once in the shop layout:
 *   data-reveal            — the element fades up (optional data-reveal-delay="120")
 *   data-stagger           — its children pop in one after another
 *   data-words             — its .mn-w word spans rise in with a soft blur (SectionHead titles)
 * The hiding only happens once this runs, so with JavaScript off (or before hydration) everything is fully
 * visible — safe for SEO. Re-scans on every navigation and for content added later. Reduced motion: no effect.
 */
export function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("mn-reveal-ready"); // activates the "hidden until seen" CSS

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("mn-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    const seen = new WeakSet<Element>(); // per run, so a re-run (navigation, Strict Mode) re-observes everything
    const prep = (el: HTMLElement) => {
      if (seen.has(el) || el.classList.contains("mn-in")) return;
      seen.add(el);
      const d = el.getAttribute("data-reveal-delay");
      if (d) el.style.setProperty("--mn-d", `${d}ms`);
      if (el.hasAttribute("data-stagger")) {
        Array.from(el.children).forEach((c, i) => (c as HTMLElement).style.setProperty("--si", String(Math.min(i, 12))));
      }
      if (el.hasAttribute("data-words")) {
        el.querySelectorAll<HTMLElement>(".mn-w").forEach((w, i) => w.style.setProperty("--w", String(i)));
      }
      // Anything already on screen reveals at once; the rest when scrolled to.
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92 && r.bottom > 0) requestAnimationFrame(() => el.classList.add("mn-in"));
      else io.observe(el);
    };

    const scan = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(SELECTOR)) prep(root);
      root.querySelectorAll<HTMLElement>(SELECTOR).forEach(prep);
    };
    scan(document);

    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => n instanceof HTMLElement && scan(n));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
