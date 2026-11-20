import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CloudRain, Leaf, Snowflake, Sun } from "lucide-react";
import { EMERGENCY_SIGNS, FIRST_AID } from "@/lib/health/firstAid";
import { SEASONS, seasonByKey, seasonFor, type SeasonKey } from "@/lib/health/seasons";
import { TOPICS, TOPIC_GROUPS } from "@/lib/health/topics";
import { EmergencyBox, FirstAidIconView, HealthDisclaimer, ProductChips } from "@/components/health/HealthBits";

export const metadata: Metadata = {
  title: "Health hub: seasonal care, first aid and health topics",
  description: "Seasonal health alerts for India, step-by-step first-aid guides and plain-language health topics, with the medicines and supplies that help.",
  alternates: { canonical: "/health" },
};

const SEASON_ICON: Record<SeasonKey, typeof Sun> = { summer: Sun, monsoon: CloudRain, autumn: Leaf, winter: Snowflake };

export default async function HealthHub({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const sp = await searchParams;
  const current = seasonFor();
  const season = seasonByKey(sp.season) ?? seasonByKey(current)!;
  const SeasonIcon = SEASON_ICON[season.key];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-chip px-3 py-1 text-xs font-semibold text-chip-fg"><BookOpen className="h-4 w-4" aria-hidden="true" /> Health hub</span>
        <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Stay well, season by season</h1>
        <p className="mt-3 text-ink-2">Simple seasonal advice for Bhubaneswar and across India, first-aid guides for minor injuries, and plain-language explanations of common health topics, with the medicines and supplies that help.</p>
      </header>

      {/* Seasonal alerts */}
      <section id="seasonal" aria-labelledby="seasonal-title" className="mt-10 scroll-mt-32">
        <h2 id="seasonal-title" className="text-2xl font-bold text-ink">Seasonal alerts</h2>
        <nav aria-label="Choose a season" className="mt-4 flex flex-wrap gap-2">
          {SEASONS.map((s) => {
            const active = s.key === season.key;
            return (
              <Link
                key={s.key}
                href={`/health?season=${s.key}#seasonal`}
                aria-current={active ? "true" : undefined}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${active ? "border-teal-700 bg-teal-700 text-white" : "border-line bg-surface text-ink hover:border-teal-600"}`}
              >
                {s.label}
                {s.key === current && <span className={`ml-2 text-[11px] font-bold uppercase tracking-wide ${active ? "text-lime-200" : "text-teal-700"}`}>Now</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 grid gap-6 rounded-3xl border border-line bg-surface p-6 text-ink shadow-card sm:p-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-teal-700"><SeasonIcon className="h-5 w-5" aria-hidden="true" /> {season.label} · {season.months}</p>
            <h3 className="mt-2 text-2xl font-bold">{season.headline}</h3>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Common health risks">
              {season.risks.map((r) => <li key={r} className="rounded-full bg-chip px-3 py-1 text-xs font-semibold text-chip-fg">{r}</li>)}
            </ul>
            <ul className="mt-5 list-disc space-y-2 pl-5 text-sm text-ink-2">
              {season.tips.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>See a doctor if:</strong> {season.see}</p>
          </div>
          <div className="space-y-6">
            <ProductChips items={season.products} />
            <div>
              <p className="text-sm font-semibold">Read more</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {season.links.map((l) => (
                  <li key={l.href}><Link href={l.href} className="inline-flex items-center gap-1.5 font-medium text-teal-700 hover:underline">{l.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* First aid */}
      <section id="first-aid" aria-labelledby="first-aid-title" className="mt-14 scroll-mt-32">
        <h2 id="first-aid-title" className="text-2xl font-bold text-ink">First-aid guides</h2>
        <p className="mt-1 text-sm text-ink-muted">Quick steps for common minor injuries and illnesses, and the signs that mean you need help now.</p>
        <div className="mt-5"><EmergencyBox title="Call 112 (ambulance 108) straight away for" items={EMERGENCY_SIGNS} /></div>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIRST_AID.map((g) => (
            <li key={g.slug}>
              <Link href={`/health/first-aid/${g.slug}`} className="group flex h-full gap-4 rounded-card border border-line bg-surface p-5 text-ink transition-all hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-card">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-chip text-chip-fg"><FirstAidIconView icon={g.icon} /></span>
                <span>
                  <span className="block font-semibold group-hover:text-teal-700">{g.title}</span>
                  <span className="mt-1 block text-sm text-ink-2">{g.summary}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Topics */}
      <section id="topics" aria-labelledby="topics-title" className="mt-14 scroll-mt-32">
        <h2 id="topics-title" className="text-2xl font-bold text-ink">Health topics</h2>
        <p className="mt-1 text-sm text-ink-muted">Plain-language summaries from MedlinePlus, a free service of the U.S. National Library of Medicine.</p>
        <div className="mt-5 space-y-8">
          {TOPIC_GROUPS.map((group) => (
            <div key={group}>
              <h3 className="text-sm font-bold uppercase tracking-wide text-teal-700">{group}</h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {TOPICS.filter((t) => t.group === group).map((t) => (
                  <li key={t.slug}>
                    <Link href={`/health/topics/${t.slug}`} className="block h-full rounded-xl border border-line bg-surface p-4 text-ink transition-colors hover:border-teal-600">
                      <span className="block font-semibold">{t.title}</span>
                      <span className="mt-1 block text-xs text-ink-2">{t.blurb}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-12"><HealthDisclaimer /></div>
    </main>
  );
}
