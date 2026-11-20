import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { FIRST_AID, firstAidBySlug } from "@/lib/health/firstAid";
import { EmergencyBanner, FirstAidIconView, HealthDisclaimer, HealthShell, ProductChips } from "@/components/health/HealthBits";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = firstAidBySlug(slug);
  if (!g) return { title: "Guide not found", robots: { index: false } };
  return {
    title: `First aid for ${g.title.toLowerCase()}`,
    description: `${g.summary} Step-by-step first-aid guidance and when to get medical help.`,
    alternates: { canonical: `/health/first-aid/${g.slug}` },
  };
}

export default async function FirstAidPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = firstAidBySlug(slug);
  if (!g) notFound();
  const others = FIRST_AID.filter((x) => x.slug !== g.slug).slice(0, 6);

  return (
    <HealthShell>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm" style={{ color: "var(--hh-muted)" }}>
          <Link href="/" className="hover:underline">Home</Link> / <Link href="/health" className="hover:underline">Health hub</Link> / <Link href="/health/first-aid" className="hover:underline">First aid</Link> / <span style={{ color: "var(--hh-ink)" }}>{g.title}</span>
        </nav>

        <header className="flex items-start gap-4">
          <span className="hh-tile hh-tile-lg"><FirstAidIconView icon={g.icon} className="h-8 w-8" /></span>
          <div>
            <h1 className="hh-title text-3xl sm:text-4xl">{g.title}</h1>
            <p className="mt-2 text-base leading-relaxed" style={{ color: "var(--hh-ink2)" }}>{g.summary}</p>
          </div>
        </header>

        <div className="mt-8"><EmergencyBanner items={g.emergency} /></div>

        <section aria-labelledby="steps" className="mt-9">
          <h2 id="steps" className="text-xl font-extrabold" style={{ color: "var(--hh-ink)" }}>What to do</h2>
          <ol className="mt-4 space-y-3">
            {g.steps.map((s, i) => (
              <li key={s} className="hh-step">
                <span aria-hidden="true" className="hh-num">{i + 1}</span>
                <span className="text-[0.95rem] leading-relaxed" style={{ color: "var(--hh-ink)" }}>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="avoid" className="hh-card mt-9 p-5 sm:p-6">
          <h2 id="avoid" className="text-xl font-extrabold" style={{ color: "var(--hh-ink)" }}>What not to do</h2>
          <ul className="mt-3 space-y-2.5">
            {g.avoid.map((s) => <li key={s} className="hh-no"><X className="h-4 w-4" aria-hidden="true" /> <span>{s}</span></li>)}
          </ul>
        </section>

        {g.products.length > 0 && <div className="hh-card mt-9 p-5 sm:p-6"><ProductChips items={g.products} title="Helpful to keep at home" /></div>}

        <div className="mt-9"><HealthDisclaimer /></div>

        <section aria-labelledby="more" className="mt-12">
          <h2 id="more" className="text-lg font-extrabold" style={{ color: "var(--hh-ink)" }}>More first-aid guides</h2>
          <ul className="mt-3 flex flex-wrap gap-2.5">
            {others.map((o) => (
              <li key={o.slug}><Link href={`/health/first-aid/${o.slug}`} className="hh-chip">{o.title}</Link></li>
            ))}
          </ul>
        </section>
      </main>
    </HealthShell>
  );
}
