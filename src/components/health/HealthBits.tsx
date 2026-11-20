import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Activity, Bandage, Bug, ChevronRight, Droplets, Flame, Footprints, Pill, ShieldCheck, ShoppingBag, Siren, SprayCan, Sun, Thermometer, TriangleAlert } from "lucide-react";
import { FIRST_AID, REVIEWED, type FirstAidIcon } from "@/lib/health/firstAid";
import { KitArt, LeafCluster, SnakeIcon, TriangleArt } from "./HealthArt";
import "./health.css";

const ICONS: Record<Exclude<FirstAidIcon, "snake">, LucideIcon> = { flame: Flame, droplets: Droplets, thermometer: Thermometer, sun: Sun, bug: Bug, activity: Activity, footprints: Footprints, bandage: Bandage, siren: Siren };

export function FirstAidIconView({ icon, className = "h-7 w-7" }: { icon: FirstAidIcon; className?: string }) {
  if (icon === "snake") return <SnakeIcon className={className} />;
  const Icon = ICONS[icon];
  return <Icon className={className} aria-hidden="true" strokeWidth={1.8} />;
}

/** The soft green page scene with corner leaves. Wrap a page's <main> in it. */
export function HealthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="hh-scene">
      <LeafCluster className="hh-deco -left-10 top-16 w-36 -rotate-6 sm:w-44" />
      <LeafCluster className="hh-deco -right-8 top-[36rem] hidden w-44 rotate-[200deg] sm:block" />
      <LeafCluster className="hh-deco -bottom-6 -left-8 w-40 rotate-12" />
      <div className="hh-main">{children}</div>
    </div>
  );
}

const CHIP_ICONS: [RegExp, LucideIcon][] = [
  [/ors|electrolyte|glucose|saline/i, Droplets],
  [/burn|bandage|gauze|crepe|povidone|calamine|hydrocort/i, Bandage],
  [/antiseptic|sanitizer|spray/i, SprayCan],
  [/vitamin|zinc|mask|mosquito|antifungal|repellent/i, ShieldCheck],
  [/thermometer|monitor|glucometer/i, Thermometer],
  [/sun|prickly/i, Sun],
];
const chipIcon = (q: string): LucideIcon => CHIP_ICONS.find(([re]) => re.test(q))?.[1] ?? Pill;

/** Links that open our medicine list for a search, so the shop's own products sit beside the advice. */
export function ProductChips({ items, title = "Useful from our shop", heading = true }: { items: { label: string; q: string }[]; title?: string; heading?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div>
      {heading && (
        <p className="flex items-center gap-2 text-base font-bold" style={{ color: "var(--hh-ink)" }}>
          <ShoppingBag className="h-5 w-5" style={{ color: "var(--hh-accent)" }} aria-hidden="true" /> {title}
        </p>
      )}
      <ul className={`${heading ? "mt-3" : ""} flex flex-wrap gap-2.5`}>
        {items.map((p) => {
          const Icon = chipIcon(`${p.q} ${p.label}`);
          return (
            <li key={p.q}>
              <Link href={`/medicines?q=${encodeURIComponent(p.q)}`} className="hh-chip">
                <Icon className="h-4 w-4" aria-hidden="true" /> {p.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The standing "this is not medical advice" note. */
export function HealthDisclaimer({ imported = false }: { imported?: boolean }) {
  return (
    <p className="hh-card rounded-2xl px-4 py-3 text-xs leading-relaxed" style={{ color: "var(--hh-ink2)" }}>
      {imported
        ? "General health information from the U.S. National Library of Medicine. Guidance, test names and medicine brands can differ in India. It is not a prescription or medical advice, and our pharmacist has not reviewed it. Please follow your doctor's or pharmacist's instructions."
        : `General first-aid and health information, not medical advice. It does not replace a doctor. In an emergency call 112 (ambulance 108).${REVIEWED ? "" : " This page has not yet been reviewed by our pharmacist."}`}
    </p>
  );
}

/** Pink emergency banner: kit picture, title and the warning signs. */
export function EmergencyBanner({ title = "Call 112 (ambulance 108) right away if", items, twoColumns = false }: { title?: string; items: string[]; twoColumns?: boolean }) {
  return (
    <div role="note" className="hh-alert">
      <div className="hh-alert-art"><KitArt className="h-20 w-24 sm:h-28 sm:w-32" /></div>
      <div className="min-w-0">
        <h3 className="flex items-start gap-2 text-lg font-bold sm:text-xl">
          <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" /> {title}
        </h3>
        <ul className={twoColumns ? "cols" : undefined}>
          {items.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>
      <TriangleArt className="pointer-events-none absolute right-8 top-1/2 hidden h-28 w-32 -translate-y-1/2 text-rose-400/50 lg:block" />
    </div>
  );
}

/** The grid of first-aid guide cards (used on the hub and the first-aid page). */
export function FirstAidGrid() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FIRST_AID.map((g) => (
        <li key={g.slug}>
          <Link href={`/health/first-aid/${g.slug}`} className="hh-card-link">
            <span className="hh-tile"><FirstAidIconView icon={g.icon} /></span>
            <span className="min-w-0">
              <span className="block text-[1.02rem] font-bold">{g.title}</span>
              <span className="mt-0.5 block text-sm leading-snug" style={{ color: "var(--hh-ink2)" }}>{g.summary}</span>
            </span>
            <span className="hh-go" aria-hidden="true"><ChevronRight className="h-4 w-4" /></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
