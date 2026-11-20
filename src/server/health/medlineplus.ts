import { cached } from "../cache";

/**
 * Reads plain-language health summaries from MedlinePlus, the free service of the U.S. National Library of Medicine.
 * Its own text is public information; we show it with a link and credit back to the source and never copy images.
 * Web service: https://wsearch.nlm.nih.gov/ (no key needed). Results are kept for a day, and the pages that show them are
 * also kept at the CDN, so the service is called rarely.
 */

export type Block = { t: "h"; text: string } | { t: "p"; text: string } | { t: "ul"; items: string[] };
export type TopicText = { title: string; url: string; blocks: Block[]; credit?: string };

// The US name of a common medicine is shown with the name used in India.
const localise = (s: string) => s.replace(/\bacetaminophen\b/gi, (m) => (m[0] === "A" ? "Paracetamol (acetaminophen)" : "paracetamol (acetaminophen)"));

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

const plain = (s: string) => localise(decode(s.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim());

/** Turns the service's small HTML (p, ul, li, headings as bare text) into plain blocks, so nothing from outside is ever injected as markup. */
export function toBlocks(html: string): Block[] {
  const cleaned = html.replace(/<\/?span[^>]*>/gi, "");
  const tokens = cleaned.split(/(<\/?(?:p|ul|ol|li)\b[^>]*>)/gi).filter((t) => t !== "");
  const blocks: Block[] = [];
  let inP = false;
  let inLi = false;
  let list: string[] | null = null;
  const flushList = () => {
    if (list && list.length) blocks.push({ t: "ul", items: list });
    list = null;
  };
  for (const tok of tokens) {
    const tag = /^<(\/?)(p|ul|ol|li)\b/i.exec(tok);
    if (tag) {
      const closing = tag[1] === "/";
      const name = tag[2].toLowerCase();
      if (name === "p") inP = !closing;
      else if (name === "li") {
        inLi = !closing;
        if (!closing && !list) list = [];
      } else if (closing) flushList();
      else list = [];
      continue;
    }
    const text = plain(tok);
    if (!text) continue;
    if (inLi) {
      (list ??= []).push(text);
    } else if (inP) {
      flushList();
      blocks.push({ t: "p", text });
    } else {
      flushList();
      // Bare text outside a paragraph is a heading such as "What is dengue?"
      blocks.push(text.length <= 140 ? { t: "h", text } : { t: "p", text });
    }
  }
  flushList();
  return blocks;
}

async function load(source: string, term: string): Promise<TopicText> {
  const url = `https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=${encodeURIComponent(term)}&retmax=8&rettype=brief`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: "application/xml" } });
  if (!res.ok) throw new Error(`medlineplus ${res.status}`);
  const xml = await res.text();
  const wanted = `https://medlineplus.gov/${source}.html`;
  for (const doc of xml.split("<document ").slice(1)) {
    if (!doc.startsWith(`rank=`) || !doc.includes(`url="${wanted}"`)) continue;
    const title = /<content name="title">([\s\S]*?)<\/content>/.exec(doc)?.[1];
    const summary = /<content name="FullSummary">([\s\S]*?)<\/content>/.exec(doc)?.[1];
    if (!title || !summary) continue;
    const blocks = toBlocks(decode(summary));
    // A heading at the very end is the summary's own credit line (for example the CDC), not a section title.
    const last = blocks[blocks.length - 1];
    const credit = last?.t === "h" ? last.text : undefined;
    if (credit) blocks.pop();
    if (blocks.length === 0) continue;
    return { title: plain(title), url: wanted, blocks, credit };
  }
  throw new Error("topic not found"); // thrown, so a miss is never cached
}

/** One topic's text, kept in memory for a day. Rejects when the service is unreachable or the topic is missing; callers show a fallback. */
export function getTopicText(source: string, term: string): Promise<TopicText> {
  return cached(`medline:${source}`, 24 * 3600_000, () => load(source, term));
}
