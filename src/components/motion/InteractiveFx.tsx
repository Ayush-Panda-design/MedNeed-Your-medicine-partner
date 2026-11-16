"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/*
 * Three small interactive effects, mounted once in the shop layout. No animation library: plain pointer/scroll listeners
 * that only touch the elements involved, so they stay cheap on a phone.
 *
 *  - Cursor: a soft ring and dot follow the mouse (the real cursor stays visible). The ring grows over links and buttons.
 *    Mouse devices only; hidden over text fields.
 *  - Magnetic (data-magnetic): the element leans toward the pointer. Mouse devices only.
 *  - Parallax (data-parallax="0.12"): the element drifts as the page scrolls, faster for larger values (negative moves
 *    the other way). Only elements on screen are updated.
 *
 * Everything is off for people who prefer reduced motion.
 */
const LINKISH = "a[href], button, [role='button'], summary, label[for], select, [data-cursor]";
const TEXTISH = "input:not([type='checkbox']):not([type='radio']):not([type='button']):not([type='submit']), textarea, [contenteditable='true']";

export function InteractiveFx() {
  const pathname = usePathname();
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  /* ---- cursor + magnetic: set up once ---- */
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const r = ring.current;
    const d = dot.current;
    if (!fine || reduce || !r || !d) return;

    const root = document.documentElement;
    root.classList.add("mn-cursor-on");
    let tx = -100, ty = -100, rx = -100, ry = -100, raf = 0, seen = false;
    let magnet: HTMLElement | null = null;

    const loop = () => {
      rx += (tx - rx) * 0.2;
      ry += (ty - ry) * 0.2;
      r.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
      raf = Math.abs(tx - rx) > 0.15 || Math.abs(ty - ry) > 0.15 ? requestAnimationFrame(loop) : 0;
    };
    const resetMagnet = () => {
      if (!magnet) return;
      magnet.style.setProperty("--bx", "0px");
      magnet.style.setProperty("--by", "0px");
      magnet = null;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX;
      ty = e.clientY;
      d.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      if (!seen) {
        seen = true;
        rx = tx;
        ry = ty;
        root.classList.add("mn-cursor-seen");
      }
      if (!raf) raf = requestAnimationFrame(loop);

      const el = e.target as Element | null;
      r.classList.toggle("is-link", Boolean(el?.closest?.(LINKISH)));
      r.classList.toggle("is-text", Boolean(el?.closest?.(TEXTISH)));

      const m = (el?.closest?.("[data-magnetic]") as HTMLElement | null) ?? null;
      if (m !== magnet) resetMagnet();
      if (m) {
        magnet = m;
        const b = m.getBoundingClientRect();
        const k = Number(m.getAttribute("data-magnetic")) || 0.28;
        const clamp = (n: number) => Math.max(-10, Math.min(10, n));
        m.style.setProperty("--bx", `${clamp((e.clientX - (b.left + b.width / 2)) * k).toFixed(1)}px`);
        m.style.setProperty("--by", `${clamp((e.clientY - (b.top + b.height / 2)) * k).toFixed(1)}px`);
      }
    };
    const onDown = () => r.classList.add("is-down");
    const onUp = () => r.classList.remove("is-down");
    const onLeave = () => { root.classList.remove("mn-cursor-seen"); seen = false; resetMagnet(); };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
      root.classList.remove("mn-cursor-on", "mn-cursor-seen");
    };
  }, []);

  /* ---- parallax: re-scan on every navigation ---- */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    if (!items.length) return;
    const live = new Set<HTMLElement>();
    let raf = 0;

    const paint = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      live.forEach((el) => {
        const speed = Number(el.getAttribute("data-parallax")) || 0.1;
        const b = el.getBoundingClientRect();
        const off = (b.top + b.height / 2 - mid) * speed;
        el.style.setProperty("--py", `${Math.max(-90, Math.min(90, -off)).toFixed(1)}px`);
      });
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(paint); };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) (e.isIntersecting ? live.add(e.target as HTMLElement) : live.delete(e.target as HTMLElement));
        kick();
      },
      { rootMargin: "120px 0px" },
    );
    items.forEach((el) => io.observe(el));
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return (
    <>
      <div ref={ring} className="mn-cur mn-cur-ring" aria-hidden><i /></div>
      <div ref={dot} className="mn-cur mn-cur-dot" aria-hidden><i /></div>
    </>
  );
}
