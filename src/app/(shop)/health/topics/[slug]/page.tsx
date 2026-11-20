import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { topicBySlug } from "@/lib/health/topics";
import { getTopicText, type TopicText } from "@/server/health/medlineplus";
import { HealthDisclaimer, HealthShell, ProductChips } from "@/components/health/HealthBits";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = topicBySlug(slug);
  if (!t) return { title: "Topic not found", robots: { index: false } };
  // The text is MedlinePlus's own, so it is kept out of search results to avoid duplicating their page.
  return { title: `${t.title}: health topic`, description: t.blurb, robots: { index: false, follow: true }, alternates: { canonical: `/health/topics/${t.slug}` } };
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = topicBySlug(slug);
  if (!topic) notFound();

  let text: TopicText | null = null;
  try {
    text = await getTopicText(topic.source, topic.term);
  } catch {
    text = null; // the source is unreachable right now: show a friendly fallback below
  }
  const sourceUrl = text?.url ?? `https://medlineplus.gov/${topic.source}.html`;

  return (
    <HealthShell>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm" style={{ color: "var(--hh-muted)" }}>
          <Link href="/" className="hover:underline">Home</Link> / <Link href="/health" className="hover:underline">Health hub</Link> / <Link href="/health#topics" className="hover:underline">Topics</Link> / <span style={{ color: "var(--hh-ink)" }}>{topic.title}</span>
        </nav>

        <h1 className="hh-title text-3xl sm:text-4xl">{topic.title}</h1>
        <p className="mt-2 text-base leading-relaxed" style={{ color: "var(--hh-ink2)" }}>{topic.blurb}</p>
        <span aria-hidden="true" className="mt-4 block h-[3px] w-14 rounded-full" style={{ background: "var(--hh-accent)" }} />

        {text ? (
          <article className="hh-card hh-article mt-8 space-y-4 p-5 sm:p-8" style={{ color: "var(--hh-ink2)" }}>
            {text.blocks.map((b, i) =>
              b.t === "h" ? (
                <h2 key={i}>{b.text}</h2>
              ) : b.t === "ul" ? (
                <ul key={i} className="hh-dot-list">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
              ) : (
                <p key={i} className="text-[0.95rem] leading-relaxed">{b.text}</p>
              ),
            )}
          </article>
        ) : (
          <div role="status" className="hh-card mt-8 p-5 text-sm" style={{ color: "var(--hh-ink2)" }}>
            We could not load this summary right now. You can read it directly on the source page below, or try again in a little while.
          </div>
        )}

        <p className="hh-card mt-6 flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 text-sm" style={{ color: "var(--hh-ink2)" }}>
          Source:
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold hover:underline" style={{ color: "var(--hh-accent)" }}>
            MedlinePlus, U.S. National Library of Medicine <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          {text?.credit && <span style={{ color: "var(--hh-muted)" }}>· Summary by {text.credit}</span>}
        </p>

        {topic.q && <div className="hh-card mt-6 p-5"><ProductChips items={[{ label: `Medicines and supplies for ${topic.title.toLowerCase()}`, q: topic.q }]} title="From our shop" /></div>}

        <div className="mt-6"><HealthDisclaimer imported /></div>
      </main>
    </HealthShell>
  );
}
