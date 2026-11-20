import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { topicBySlug } from "@/lib/health/topics";
import { getTopicText, type TopicText } from "@/server/health/medlineplus";
import { HealthDisclaimer, ProductChips } from "@/components/health/HealthBits";

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
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-muted">
        <Link href="/" className="hover:text-teal-700">Home</Link> / <Link href="/health" className="hover:text-teal-700">Health hub</Link> / <Link href="/health#topics" className="hover:text-teal-700">Topics</Link> / <span className="text-ink">{topic.title}</span>
      </nav>

      <h1 className="text-3xl font-bold text-ink">{topic.title}</h1>
      <p className="mt-2 text-ink-2">{topic.blurb}</p>

      {text ? (
        <article className="mt-8 space-y-4 text-ink-2">
          {text.blocks.map((b, i) =>
            b.t === "h" ? (
              <h2 key={i} className="pt-3 text-xl font-bold text-ink">{b.text}</h2>
            ) : b.t === "ul" ? (
              <ul key={i} className="list-disc space-y-1.5 pl-6 text-sm leading-relaxed">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
            ) : (
              <p key={i} className="text-sm leading-relaxed">{b.text}</p>
            ),
          )}
        </article>
      ) : (
        <div role="status" className="mt-8 rounded-2xl border border-line bg-surface p-5 text-sm text-ink-2">
          We could not load this summary right now. You can read it directly on the source page below, or try again in a little while.
        </div>
      )}

      <p className="mt-8 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-2">
        Source:
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline">
          MedlinePlus, U.S. National Library of Medicine <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        {text?.credit && <span className="text-ink-muted">· Summary by {text.credit}</span>}
      </p>

      {topic.q && <div className="mt-8"><ProductChips items={[{ label: `Medicines and supplies for ${topic.title.toLowerCase()}`, q: topic.q }]} title="From our shop" /></div>}

      <div className="mt-8"><HealthDisclaimer imported /></div>
    </main>
  );
}
