"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { BANNERS } from "@/lib/homeMedia";
import { CATEGORY_TILES, FALLBACK_TILE } from "@/lib/categoryTiles";
import { CategoryArt } from "../category/CategoryArt";
import "../category/tiles.css";
import "./home.css";

const EVERY_MS = 6500;

/**
 * Wide promotional banners that slide (native scroll-snap, so swiping works everywhere). Auto-advances while
 * visible and not hovered or touched; arrows and dots for direct control. Reduced motion: no auto-advance.
 */
export function OfferBanners() {
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  useEffect(() => {
    const el = track.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Keep the dot in sync with manual swipes.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setI(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  const go = (n: number) => {
    const el = track.current;
    if (!el) return;
    const k = (n + BANNERS.length) % BANNERS.length;
    el.scrollTo({ left: k * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
  };

  useEffect(() => {
    if (hold || !visible || reduced) return;
    const t = window.setTimeout(() => go(i + 1), EVERY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, hold, visible, reduced]);

  return (
    <section aria-roledescription="carousel" aria-label="Offers and highlights" className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
      <div className="ob-wrap" onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)} onTouchStart={() => setHold(true)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
        <div ref={track} className="ob-track">
          {BANNERS.map((b, k) => {
            const t = CATEGORY_TILES[b.art] ?? FALLBACK_TILE;
            const style = { "--from": b.from, "--to": b.to, "--c1": t.c1, "--c2": t.c2, "--a": t.a, "--p": t.p } as CSSProperties;
            return (
              <div key={b.title} className="ob-slide" style={style} role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${BANNERS.length}`} aria-hidden={k !== i}>
                <div className="ob-text">
                  <span className="ob-eyebrow">{b.eyebrow}</span>
                  <h3 className="ob-title">{b.title}</h3>
                  <p className="ob-copy">{b.text}</p>
                  <Link href={b.href} className="ob-cta" tabIndex={k === i ? 0 : -1}>
                    {b.cta} <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
                <div className="ob-media" aria-hidden>
                  {b.photo ? (
                    <Image src={b.photo} alt="" fill sizes="(min-width: 1024px) 520px, 90vw" className="ob-photo" />
                  ) : (
                    <>
                      <span className="ob-disc" />
                      <span className="ob-disc ob-disc-2" />
                      <CategoryArt slug={b.art} className="ct-art ob-art" />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" className="ob-arrow ob-prev" aria-label="Previous" onClick={() => go(i - 1)}><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" className="ob-arrow ob-next" aria-label="Next" onClick={() => go(i + 1)}><ChevronRight className="h-5 w-5" /></button>
        <div className="ob-dots">
          {BANNERS.map((b, k) => (
            <button key={b.title} type="button" aria-label={`Show slide ${k + 1}`} aria-current={k === i} className={`ob-dot ${k === i ? "ob-dot-on" : ""}`} onClick={() => go(k)} />
          ))}
        </div>
      </div>
    </section>
  );
}
