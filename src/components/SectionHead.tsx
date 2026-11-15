import type { ReactNode } from "react";
import { heroSerif } from "@/lib/fonts";

function Bar() {
  return <span aria-hidden className="h-[2px] w-6 rounded-full bg-gradient-to-r from-teal-600 to-lime-400" />;
}

/** Consistent section heading used across the homepage: a branded eyebrow + title + optional sub and action.
 *  Shared styling is what makes the separate sections read as one connected page. */
/** display: large Fraunces title with the last word in green italic (the Lovable-concept heading style). */
export function SectionHead({ eyebrow, title, sub, action, center = false, display = false }: { eyebrow: string; title: string; sub?: string; action?: ReactNode; center?: boolean; display?: boolean }) {
  return (
    <div className={`${display ? `mb-7 sm:mb-9 ${heroSerif.variable}` : "mb-6"} ${center ? "flex flex-col items-center text-center" : "flex items-end justify-between gap-4"}`}>
      <div className={center ? "flex flex-col items-center" : ""}>
        <span className="inline-flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-teal-600">
          <Bar /> {eyebrow} {center && <Bar />}
        </span>
        <h2 data-words className={display ? "mn-display mt-2 text-4xl leading-[1.05] text-slate-900 sm:text-5xl lg:text-6xl" : "mt-2 text-2xl font-bold sm:text-3xl"}>
          {title.split(" ").map((w, i, a) => (
            <span key={i}>
              {display && i === a.length - 1 ? <em className="mn-w mn-accent">{w}</em> : <span className="mn-w">{w}</span>}
              {i < a.length - 1 ? " " : ""}
            </span>
          ))}
        </h2>
        {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
