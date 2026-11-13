import { EMBED_DIM, geminiBase, geminiEmbedModel } from "../env";
import { coolDown, keyCount, nextKey } from "./keys";
import { recordUsage } from "./usage";
import { AiUnavailable } from "./gemini";
import { cached } from "./cache";

const RATE_COOLDOWN_MS = Number(process.env.GEMINI_COOLDOWN_MS) || 60_000;
const NET_COOLDOWN_MS = Math.min(RATE_COOLDOWN_MS, Number(process.env.GEMINI_NET_COOLDOWN_MS) || 15_000);
/** Gemini accepts up to 100 texts per batch; stay well under for safety and smaller payloads. */
export const EMBED_BATCH = 32;

async function callEmbeddings(path: string, body: unknown): Promise<Response | null> {
  const attempts = keyCount();
  let lastError = "no key";
  for (let i = 0; i < attempts; i++) {
    const slot = nextKey();
    if (!slot) break;
    let res: Response;
    try {
      res = await fetch(`${geminiBase()}/v1beta/models/${geminiEmbedModel()}:${path}?key=${encodeURIComponent(slot.key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e) {
      lastError = `network: ${(e as Error).message}`;
      coolDown(slot.id, NET_COOLDOWN_MS);
      recordUsage(slot.id, true);
      continue;
    }
    const failed = res.status >= 400;
    recordUsage(slot.id, failed);
    if (res.status === 429 || res.status === 503) {
      coolDown(slot.id, RATE_COOLDOWN_MS);
      lastError = `rate/quota ${res.status}`;
      continue;
    }
    if (res.status === 400) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (/api key (not valid|expired)|API_KEY_INVALID/i.test(JSON.stringify(err.error ?? ""))) {
        coolDown(slot.id, 3600_000); // a bad/expired key: park it for an hour and try the next one
        lastError = `invalid API key (${slot.id})`;
        continue;
      }
      throw new AiUnavailable(`bad embeddings request: ${err.error?.message ?? "400"}`);
    }
    if (res.status === 404) throw new AiUnavailable(`embedding model "${geminiEmbedModel()}" not found - set GEMINI_EMBED_MODEL=gemini-embedding-001`);
    if (failed) {
      lastError = `embeddings ${res.status}`;
      continue;
    }
    return res;
  }
  throw new AiUnavailable(`embeddings unavailable (${lastError})`);
}

/** Embed several texts in one call. Order of results matches the input. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  if (keyCount() === 0) throw new AiUnavailable("No Gemini API keys configured.");
  const model = `models/${geminiEmbedModel()}`;
  const res = await callEmbeddings("batchEmbedContents", {
    requests: texts.map((t) => ({ model, content: { parts: [{ text: t.slice(0, 8000) }] }, outputDimensionality: EMBED_DIM })),
  });
  const data = (await res!.json().catch(() => ({}))) as { embeddings?: { values?: number[] }[] };
  const out = (data.embeddings ?? []).map((e) => e.values ?? []);
  if (out.length !== texts.length || out.some((v) => !v.length)) throw new AiUnavailable("embeddings response malformed");
  return out;
}

/** Embed one text (a user's query). Cached in ai_cache so repeated searches cost no quota. */
export async function embedQuery(text: string): Promise<number[]> {
  const q = text.trim().toLowerCase().slice(0, 500);
  const { values } = await cached<{ values: number[] }>("embed-query", `${geminiEmbedModel()}:${q}`, 7 * 24 * 3600, async () => {
    if (keyCount() === 0) throw new AiUnavailable("No Gemini API keys configured.");
    const res = await callEmbeddings("embedContent", { model: `models/${geminiEmbedModel()}`, content: { parts: [{ text: q }] }, outputDimensionality: EMBED_DIM });
    const data = (await res!.json().catch(() => ({}))) as { embedding?: { values?: number[] } };
    const v = data.embedding?.values ?? [];
    if (!v.length) throw new AiUnavailable("query embedding malformed");
    return { values: v };
  });
  return values;
}
