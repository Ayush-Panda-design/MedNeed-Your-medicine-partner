import Link from "next/link";
import { Activity, Bandage, Bug, Droplets, Flame, Footprints, Siren, Sun, Thermometer, TriangleAlert } from "lucide-react";
import type { FirstAidIcon } from "@/lib/health/firstAid";
import { REVIEWED } from "@/lib/health/firstAid";

const ICONS = { flame: Flame, droplets: Droplets, thermometer: Thermometer, sun: Sun, bug: Bug, activity: Activity, footprints: Footprints, bandage: Bandage, siren: Siren } as const;

export function FirstAidIconView({ icon, className = "h-5 w-5" }: { icon: FirstAidIcon; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon className={className} aria-hidden="true" />;
}

/** Links that open our medicine list for a search, so the shop's own products sit beside the advice. */
export function ProductChips({ items, title = "Useful from our shop" }: { items: { label: string; q: string }[]; title?: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((p) => (
          <li key={p.q}>
            <Link href={`/medicines?q=${encodeURIComponent(p.q)}`} className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-teal-600 hover:text-teal-700">
              {p.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The standing "this is not medical advice" note. */
export function HealthDisclaimer({ imported = false }: { imported?: boolean }) {
  return (
    <p className="rounded-xl border border-line bg-tint px-4 py-3 text-xs leading-relaxed text-tint-fg">
      {imported
        ? "General health information from the U.S. National Library of Medicine. Guidance, test names and medicine brands can differ in India. It is not a prescription or medical advice, and our pharmacist has not reviewed it. Please follow your doctor's or pharmacist's instructions."
        : `General first-aid and health information, not medical advice. It does not replace a doctor. In an emergency call 112 (ambulance 108).${REVIEWED ? "" : " This page has not yet been reviewed by our pharmacist."}`}
    </p>
  );
}

export function EmergencyBox({ title = "Call 112 (ambulance 108) right away if", items }: { title?: string; items: string[] }) {
  return (
    <div role="note" className="rounded-2xl border border-rose-300 bg-rose-50 p-5 text-rose-900">
      <p className="flex items-center gap-2 font-bold"><TriangleAlert className="h-5 w-5 shrink-0" aria-hidden="true" /> {title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
        {items.map((s) => <li key={s}>{s}</li>)}
      </ul>
    </div>
  );
}
