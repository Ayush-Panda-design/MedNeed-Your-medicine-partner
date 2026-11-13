import { useId } from "react";
import { LOGO_GRADIENTS, LOGO_PATHS, LOGO_VIEWBOX } from "./logoData";

const ORDER = ["pill", "diag", "upDark", "upLight", "loLime", "loDark"] as const;
const CLASS: Record<(typeof ORDER)[number], string> = {
  pill: "mn-p mn-p-pill",
  diag: "mn-p mn-p-diag",
  upDark: "mn-p mn-p-up",
  upLight: "mn-p mn-p-up",
  loLime: "mn-p mn-p-lo",
  loDark: "mn-p mn-p-lo",
};

/** The MedNeed leaf-N icon. Pure SVG; animated through the `mn-*` classes in globals.css. */
export function LogoMark({ className = "", title }: { className?: string; title?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        {ORDER.map((k) => {
          const g = LOGO_GRADIENTS[k];
          return (
            <linearGradient key={k} id={`${uid}-${k}`} gradientUnits="userSpaceOnUse" x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
              {g.stops.map(([o, c]) => (
                <stop key={o} offset={o} stopColor={c} />
              ))}
            </linearGradient>
          );
        })}
      </defs>
      {ORDER.map((k) => (
        <path key={k} className={CLASS[k]} d={LOGO_PATHS[k]} fill={`url(#${uid}-${k})`} />
      ))}
    </svg>
  );
}
