import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FIRST_AID, firstAidBySlug } from "@/lib/health/firstAid";
import { EmergencyBox, FirstAidIconView, HealthDisclaimer, ProductChips } from "@/components/health/HealthBits";

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
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-muted">
        <Link href="/" className="hover:text-teal-700">Home</Link> / <Link href="/health" className="hover:text-teal-700">Health hub</Link> / <Link href="/health#first-aid" className="hover:text-teal-700">First aid</Link> / <span className="text-ink">{g.title}</span>
      </nav>

      <header className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-chip text-chip-fg"><FirstAidIconView icon={g.icon} className="h-6 w-6" /></span>
        <div>
          <h1 className="text-3xl font-bold text-ink">{g.title}</h1>
          <p className="mt-2 text-ink-2">{g.summary}</p>
        </div>
      </header>

      <div className="mt-8"><EmergencyBox items={g.emergency} /></div>

      <section aria-labelledby="steps" className="mt-8">
        <h2 id="steps" className="text-xl font-bold text-ink">What to do</h2>
        <ol className="mt-4 space-y-3">
          {g.steps.map((s, i) => (
            <li key={s} className="flex gap-3 rounded-xl border border-line bg-surface p-4 text-ink">
              <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white">{i + 1}</span>
              <span className="text-sm leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="avoid" className="mt-8">
        <h2 id="avoid" className="text-xl font-bold text-ink">What not to do</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-6 text-sm text-ink-2">
          {g.avoid.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </section>

      {g.products.length > 0 && <div className="mt-8"><ProductChips items={g.products} title="Helpful to keep at home" /></div>}

      <div className="mt-10"><HealthDisclaimer /></div>

      <section aria-labelledby="more" className="mt-12">
        <h2 id="more" className="text-lg font-bold text-ink">More first-aid guides</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {others.map((o) => (
            <li key={o.slug}><Link href={`/health/first-aid/${o.slug}`} className="inline-flex rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:border-teal-600 hover:text-teal-700">{o.title}</Link></li>
          ))}
        </ul>
      </section>
    </main>
  );
}
