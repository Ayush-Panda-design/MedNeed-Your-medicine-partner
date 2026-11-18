import type { CSSProperties } from "react";
import { Scissors } from "lucide-react";
import "./section-divider.css";

/**
 * Dividers between homepage sections (all theme-aware: colours come from CSS variables, so light and dark both work).
 *   wave         soft curve joining two background tints (props `from` above, `to` below; defaults are the page and tint colours)
 *   ecg          thin heartbeat line that draws itself when scrolled into view
 *   perforation  blister-pack row of pill-shaped holes with a small "tear here" tab
 *   capsules     light chain of capsules and dots
 * Server-rendered and CSS-only; the ECG draw reuses the shared scroll-reveal (it adds `mn-in`).
 */
export function SectionDivider({ variant, from, to, className = "" }: { variant: "wave" | "ecg" | "perforation" | "capsules"; from?: string; to?: string; className?: string }) {
  if (variant === "wave") {
    return (
      <div aria-hidden className={`sd-wave ${className}`} style={{ "--from": from ?? "var(--bg-page)", "--to": to ?? "var(--sd-tint)" } as CSSProperties}>
        <svg viewBox="0 0 1440 56" preserveAspectRatio="none" focusable="false">
          <path d="M0 56V26C180 -4 360 -4 560 24C760 52 960 56 1160 22C1280 4 1370 6 1440 18V56Z" />
        </svg>
      </div>
    );
  }
  if (variant === "ecg") {
    return (
      <div aria-hidden data-reveal className={`sd-ecg ${className}`}>
        <svg viewBox="0 0 1000 44" preserveAspectRatio="xMidYMid meet" focusable="false">
          <path pathLength={1} d="M0 22H372l10-1 8-7 8 7h30l8 5 10-24 12 38 9-19h30l10-5 10 5H1000" />
        </svg>
      </div>
    );
  }
  if (variant === "perforation") {
    return (
      <div aria-hidden className={`sd-perf ${className}`}>
        <span className="sd-perf-row sd-perf-left" />
        <span className="sd-perf-tab"><Scissors className="h-3 w-3" /> Tear here</span>
        <span className="sd-perf-row" />
      </div>
    );
  }
  return (
    <div aria-hidden className={`sd-caps ${className}`}>
      <span />
    </div>
  );
}
