import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, ChevronRight, CloudRain, Leaf, Snowflake, Sun } from "lucide-react";
import { EMERGENCY_SIGNS } from "@/lib/health/firstAid";
import { SEASONS, seasonByKey, seasonFor, type SeasonKey } from "@/lib/health/seasons";
import { TOPICS, TOPIC_GROUPS } from "@/lib/health/topics";
import { EmergencyBanner, FirstAidGrid, HealthDisclaimer, HealthShell, ProductChips } from "@/components/health/HealthBits";
import { HeroArt, LeafCluster } from "@/components/health/HealthArt";

export const metadata: Metadata = {
  title: "Health hub: seasonal care, first aid and health topics",
  description: "Seasonal health alerts for India, step-by-step first-aid guides and plain-language health topics, with the medicines and supplies that help.",
  alternates: { canonical: "/health" },
};

const SEASON_ICON: Record<SeasonKey, { Icon: typeof Sun; tone: string }> = {
  summer: { Icon: Sun, tone: "#f59e0b" },
  monsoon: { Icon: CloudRain, tone: "#3b82f6" },
  autumn: { Icon: Leaf, tone: "#3a9a4f" },
  winter: { Icon: Snowflake, tone: "#38a3d8" },
};

export default async function HealthHub({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const sp = await searchParams;
  const current = seasonFor();
  const season = seasonByKey(sp.season) ?? seasonByKey(current)!;
  const { Icon: SeasonIcon, tone } = SEASON_ICON[season.key];

  return (
    <HealthShell>
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        {/* Headline with the shield-and-stethoscope picture */}
        <header className="relative grid items-center gap-2 md:grid-cols-[1fr_auto]">
          <div className="max-w-3xl">
            <span className="hh-eyebrow"><BookOpen className="h-4 w-4" aria-hidden="true" /> Health hub</span>
            <h1 className="hh-title mt-5 text-[2.5rem] sm:text-5xl lg:text-[3.4rem]">Stay well, <em>season by season</em></h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: "var(--hh-ink2)" }}>
              Simple seasonal advice for Bhubaneswar and across India, first-aid guides for minor injuries, and plain-language explanations of common health topics, with the medicines and supplies that help.
            </p>
            <svg viewBox="0 0 90 12" className="mt-3 h-3 w-24" aria-hidden="true"><path d="M2 8 C 20 2, 42 2, 88 8" fill="none" stroke="var(--hh-accent)" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </div>
          <HeroArt className="mx-auto -mt-2 h-44 w-auto sm:h-52 md:mt-0 md:h-64 lg:h-72" />
        </header>

        {/* Seasonal alerts */}
        <section id="seasonal" aria-labelledby="seasonal-title" className="mt-10 scroll-mt-28 sm:mt-12">
          <div className="flex items-center gap-3">
            <span className="hh-tile hh-tile-sm"><CalendarDays className="h-5 w-5" aria-hidden="true" /></span>
            <h2 id="seasonal-title" className="text-2xl font-extrabold sm:text-[1.7rem]" style={{ color: "var(--hh-ink)" }}>Seasonal alerts</h2>
          </div>
          <nav aria-label="Choose a season" className="mt-4 flex flex-wrap gap-2.5">
            {SEASONS.map((s) => {
              const { Icon, tone: t } = SEASON_ICON[s.key];
              const active = s.key === season.key;
              return (
                <Link key={s.key} href={`/health?season=${s.key}#seasonal`} aria-current={active ? "true" : undefined} className="hh-tab">
                  <Icon className="h-[1.1rem] w-[1.1rem]" style={{ color: active ? "#d9f7c4" : t }} aria-hidden="true" />
                  {s.label}
                  {s.key === current && <span className="hh-now">NOW</span>}
                </Link>
              );
            })}
          </nav>

          <div className="hh-season mt-5">
            <div className="p-6 sm:p-8">
              <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--hh-accent)" }}><SeasonIcon className="h-5 w-5" style={{ color: tone }} aria-hidden="true" /> {season.label} · {season.months}</p>
              <h3 className="mt-2 text-2xl font-extrabold leading-tight sm:text-[1.7rem]" style={{ color: "var(--hh-ink)" }}>{season.headline}</h3>
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Common health risks">
                {season.risks.map((r) => <li key={r} className="hh-risk">{r}</li>)}
              </ul>
              <ul className="hh-dot-list mt-5">
                {season.tips.map((t) => <li key={t}>{t}</li>)}
              </ul>
              <p className="hh-warn mt-5"><strong>See a doctor if:</strong> {season.see}</p>
            </div>
            <div className="relative space-y-7 p-6 sm:p-8">
              <LeafCluster className="pointer-events-none absolute -bottom-4 -right-6 h-44 w-36 opacity-40" />
              <div className="relative"><ProductChips items={season.products} /></div>
              <div className="relative">
                <p className="flex items-center gap-2 text-base font-bold" style={{ color: "var(--hh-ink)" }}><BookOpen className="h-5 w-5" style={{ color: "var(--hh-accent)" }} aria-hidden="true" /> Read more</p>
                <ul className="mt-3 space-y-2 text-[0.95rem]">
                  {season.links.map((l) => (
                    <li key={l.href}><Link href={l.href} className="inline-flex items-center gap-1.5 font-medium hover:underline" style={{ color: "var(--hh-accent)" }}>{l.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* First aid */}
        <section id="first-aid" aria-labelledby="first-aid-title" className="mt-14 scroll-mt-28">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="first-aid-title" className="text-2xl font-extrabold sm:text-[1.7rem]" style={{ color: "var(--hh-ink)" }}>First-aid guides</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--hh-ink2)" }}>Quick steps for common minor injuries and illnesses, and the signs that mean you need help now.</p>
            </div>
            <Link href="/health/first-aid" className="inline-flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: "var(--hh-accent)" }}>View all <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <div className="mt-5"><EmergencyBanner title="Call 112 (ambulance 108) straight away for" items={EMERGENCY_SIGNS} twoColumns /></div>
          <div className="mt-5"><FirstAidGrid /></div>
        </section>

        {/* Topics */}
        <section id="topics" aria-labelledby="topics-title" className="mt-14 scroll-mt-28">
          <h2 id="topics-title" className="text-2xl font-extrabold sm:text-[1.7rem]" style={{ color: "var(--hh-ink)" }}>Health topics</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--hh-ink2)" }}>Plain-language summaries from MedlinePlus, a free service of the U.S. National Library of Medicine.</p>
          <div className="mt-5 space-y-8">
            {TOPIC_GROUPS.map((group) => (
              <div key={group}>
                <h3 className="text-xs font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--hh-accent)" }}>{group}</h3>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {TOPICS.filter((t) => t.group === group).map((t) => (
                    <li key={t.slug}>
                      <Link href={`/health/topics/${t.slug}`} className="hh-card-link !items-start !rounded-2xl !p-4">
                        <span className="min-w-0">
                          <span className="block font-bold">{t.title}</span>
                          <span className="mt-1 block text-xs leading-snug" style={{ color: "var(--hh-ink2)" }}>{t.blurb}</span>
                        </span>
                        <span className="hh-go" aria-hidden="true"><ChevronRight className="h-4 w-4" /></span>
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
    </HealthShell>
  );
}
