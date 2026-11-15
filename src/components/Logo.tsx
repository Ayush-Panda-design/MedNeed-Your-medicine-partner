"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogoMark } from "./LogoMark";

type Props = {
  /** For dark backgrounds. */
  light?: boolean;
  /** Show the "For every need, for every life" line. */
  tagline?: boolean;
  size?: "sm" | "md" | "lg" | "nav";
  /** Play the entrance animation on mount. */
  entrance?: boolean;
};

const SIZES = {
  sm: { icon: "h-8 w-[34px]", text: "text-[1.4rem]", tag: "text-[0.52rem]" },
  md: { icon: "h-9 w-[38px]", text: "text-[1.6rem]", tag: "text-[0.55rem]" },
  lg: { icon: "h-14 w-[59px]", text: "text-[2.4rem]", tag: "text-[0.7rem]" },
  // Header: compact on phones, normal from the sm breakpoint.
  nav: { icon: "h-7 w-[30px] sm:h-9 sm:w-[38px]", text: "text-[21px] sm:text-[1.6rem]", tag: "text-[0.55rem]" },
} as const;

export function Logo({ light = false, tagline = false, size = "md", entrance = true }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const s = SIZES[size];
  // The entrance class is dropped once it has played, so hover/idle animations never replay it.
  const [entering, setEntering] = useState(entrance);
  useEffect(() => {
    if (!entrance) return;
    const t = setTimeout(() => setEntering(false), 2800);
    return () => clearTimeout(t);
  }, [entrance]);

  const onMove = useCallback((e: React.PointerEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", String(((e.clientX - r.left) / r.width - 0.5).toFixed(3)));
    el.style.setProperty("--my", String(((e.clientY - r.top) / r.height - 0.5).toFixed(3)));
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--mx", "0");
    el.style.setProperty("--my", "0");
  }, []);

  const onDown = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.removeAttribute("data-pop");
    void el.getBoundingClientRect(); // restart the animation
    el.setAttribute("data-pop", "1");
  }, []);

  return (
    <Link
      ref={ref}
      href="/"
      aria-label="MedNeed home"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={onDown}
      className={`mn-logo group inline-flex flex-col items-start leading-none select-none ${light ? "mn-light" : ""} ${entering ? "mn-enter" : ""}`}
    >
      <span className="inline-flex items-center gap-2">
        <LogoMark className={`mn-mark ${s.icon}`} />
        <span className={`mn-word font-lexend font-bold ${s.text}`} aria-hidden="true">
          <span className="mn-med">Med</span>
          <span className="mn-need">Need</span>
        </span>
      </span>
      {tagline && (
        <span className={`mn-tag font-lexend ${s.tag} mt-1.5 flex items-center gap-2 uppercase tracking-[0.22em]`} aria-hidden="true">
          <span className="mn-tag-line" />
          For every need, for every life
          <span className="mn-tag-line" />
        </span>
      )}
    </Link>
  );
}
