import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/lib/catalog";
import { CategoryIcon } from "./CategoryIcon";

// Each category gets its own soft tint (muted, so the grid stays calm). The tile reads as duotone:
// a soft wash + a lighter blob behind the icon. On hover the tile fills solid, the icon turns white,
// the card lifts, a coloured accent bar grows and an arrow reveals. Full class names (purge-safe).
type Tint = { tile: string; icon: string; blob: string; solid: string; bar: string; arrow: string };
const TINTS: Tint[] = [
  { tile: "bg-rose-50", icon: "text-rose-500", blob: "bg-rose-200/60", solid: "group-hover:bg-rose-500", bar: "from-rose-400 to-rose-500", arrow: "text-rose-500" },
  { tile: "bg-sky-50", icon: "text-sky-500", blob: "bg-sky-200/60", solid: "group-hover:bg-sky-500", bar: "from-sky-400 to-sky-500", arrow: "text-sky-500" },
  { tile: "bg-amber-50", icon: "text-amber-600", blob: "bg-amber-200/60", solid: "group-hover:bg-amber-500", bar: "from-amber-400 to-amber-500", arrow: "text-amber-600" },
  { tile: "bg-violet-50", icon: "text-violet-500", blob: "bg-violet-200/60", solid: "group-hover:bg-violet-500", bar: "from-violet-400 to-violet-500", arrow: "text-violet-500" },
  { tile: "bg-emerald-50", icon: "text-emerald-600", blob: "bg-emerald-200/60", solid: "group-hover:bg-emerald-500", bar: "from-emerald-400 to-emerald-500", arrow: "text-emerald-600" },
  { tile: "bg-teal-50", icon: "text-teal-600", blob: "bg-teal-200/60", solid: "group-hover:bg-teal-600", bar: "from-teal-500 to-lime-400", arrow: "text-teal-600" },
  { tile: "bg-fuchsia-50", icon: "text-fuchsia-500", blob: "bg-fuchsia-200/60", solid: "group-hover:bg-fuchsia-500", bar: "from-fuchsia-400 to-fuchsia-500", arrow: "text-fuchsia-500" },
  { tile: "bg-indigo-50", icon: "text-indigo-500", blob: "bg-indigo-200/60", solid: "group-hover:bg-indigo-500", bar: "from-indigo-400 to-indigo-500", arrow: "text-indigo-500" },
];

export function CategoryCard({ category, index }: { category: Category; index: number }) {
  const t = TINTS[index % TINTS.length];
  return (
    <Link
      href={`/medicines?category=${category.slug}`}
      className="mn-cardshine group relative flex h-full flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 pb-9 text-center transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-900/5"
    >
      <span aria-hidden className={`mn-topbar absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${t.bar}`} />
      <span className={`relative grid h-16 w-16 place-items-center overflow-hidden rounded-2xl ${t.tile} ${t.icon} transition-all duration-300 group-hover:scale-110 group-hover:text-white ${t.solid}`}>
        <span aria-hidden className={`absolute -right-1 -top-1 h-7 w-7 rounded-full ${t.blob} transition-opacity duration-300 group-hover:opacity-0`} />
        <CategoryIcon name={category.icon} className="relative h-8 w-8" />
      </span>
      <span className="font-semibold text-slate-900">{category.name}</span>
      <span className="text-xs text-slate-500">{category.blurb}</span>
      <span aria-hidden className={`absolute bottom-3 right-3.5 ${t.arrow} opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 -translate-x-1`}>
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
