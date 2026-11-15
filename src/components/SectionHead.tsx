import type { ReactNode } from "react";

function Bar() {
  return <span aria-hidden className="h-[2px] w-6 rounded-full bg-gradient-to-r from-teal-600 to-lime-400" />;
}

/** Consistent section heading used across the homepage: a branded eyebrow + title + optional sub and action.
 *  Shared styling is what makes the separate sections read as one connected page. */
export function SectionHead({ eyebrow, title, sub, action, center = false }: { eyebrow: string; title: string; sub?: string; action?: ReactNode; center?: boolean }) {
  return (
    <div className={`mb-6 ${center ? "flex flex-col items-center text-center" : "flex items-end justify-between gap-4"}`}>
      <div className={center ? "flex flex-col items-center" : ""}>
        <span className="inline-flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-teal-600">
          <Bar /> {eyebrow} {center && <Bar />}
        </span>
        <h2 data-words className="mt-2 text-2xl font-bold sm:text-3xl">
          {title.split(" ").map((w, i, a) => (
            <span key={i}>
              <span className="mn-w">{w}</span>
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
