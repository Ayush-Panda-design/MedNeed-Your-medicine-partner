import { createHash } from "crypto";
import { query, type Row } from "../db";
import { aiEnabled, geminiEmbedModel } from "../env";
import { AiUnavailable } from "./gemini";
import { embedBatch, EMBED_BATCH } from "./embeddings";

const jsonArr = (v: unknown): string[] => {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

/** The natural-language text we embed for a product — richer than the keyword search_text. */
function buildText(r: Row): string {
  const uses = jsonArr(r.uses).join(", ");
  return [
    r.name as string,
    r.salts ? `Composition: ${r.salts}` : "",
    r.category_name ? `Category: ${r.category_name}` : "",
    uses ? `Used for: ${uses}` : "",
    (r.description as string) || "",
  ].filter(Boolean).join(". ").slice(0, 2000);
}
const hashText = (model: string, text: string) => createHash("sha256").update(`${model}\n${text}`).digest("hex");

// Only medicines the store actually sells (status 'active') are embedded. The catalogue-only reference list is far too large
// to embed on free tiers, and ingredient-based symptom search (see salt-info.ts) covers it instead.
const CANDIDATE_SQL = `
  select m.id, m.name, m.description, m.uses, c.name as category_name,
    coalesce((select string_agg(s.name, ' ') from medicine_salts ms join salts s on s.id = ms.salt_id where ms.medicine_id = m.id), '') as salts,
    pe.source_hash as emb_hash
  from medicines m
  join categories c on c.id = m.category_id
  left join product_embeddings pe on pe.medicine_id = m.id
  where m.status = 'active'
    and (pe.medicine_id is null or m.updated_at > pe.updated_at or pe.model <> $1)
  order by m.updated_at desc
  limit $2`;

/**
 * Embed products that are new or whose text changed. Runs from the cron job, batched to respect free-tier limits.
 * Idempotent: a product whose text is unchanged is just "touched" so it isn't re-selected, without spending quota.
 */
export async function backfillEmbeddings(limit = EMBED_BATCH * 2): Promise<{ embedded: number; touched: number; pending: number; limited?: boolean }> {
  if (!aiEnabled()) return { embedded: 0, touched: 0, pending: 0 };
  const model = geminiEmbedModel();
  const rows = await query<Row>(CANDIDATE_SQL, [model, limit]);
  if (!rows.length) return { embedded: 0, touched: 0, pending: 0 };

  const toEmbed: { id: string; text: string; hash: string }[] = [];
  let touched = 0;
  for (const r of rows) {
    const text = buildText(r);
    const hash = hashText(model, text);
    if (r.emb_hash === hash) {
      // Text is unchanged (e.g. an unrelated edit bumped updated_at): refresh the timestamp so it stops matching.
      await query(`update product_embeddings set updated_at = now() where medicine_id = $1`, [r.id]);
      touched++;
    } else {
      toEmbed.push({ id: r.id as string, text, hash });
    }
  }

  let embedded = 0;
  for (let i = 0; i < toEmbed.length; i += EMBED_BATCH) {
    const chunk = toEmbed.slice(i, i + EMBED_BATCH);
    let vectors: number[][];
    try {
      vectors = await embedBatch(chunk.map((c) => c.text));
    } catch (e) {
      // Rate-limited part-way: keep what we saved and report it so the caller can pause and resume. Nothing saved -> surface the error.
      if (e instanceof AiUnavailable && embedded > 0) return { embedded, touched, pending: 1, limited: true };
      throw e;
    }
    for (let j = 0; j < chunk.length; j++) {
      const v = vectors[j];
      await query(
        `insert into product_embeddings (medicine_id, model, dim, embedding, source_hash, updated_at)
         values ($1,$2,$3,$4::jsonb,$5, now())
         on conflict (medicine_id) do update set model = excluded.model, dim = excluded.dim, embedding = excluded.embedding, source_hash = excluded.source_hash, updated_at = now()`,
        [chunk[j].id, model, v.length, JSON.stringify(v), chunk[j].hash],
      );
      embedded++;
    }
  }
  // Rough "pending" signal: if we filled the batch there may be more waiting.
  return { embedded, touched, pending: rows.length >= limit ? 1 : 0 };
}

/* ---------------- in-memory similarity index ---------------- */

type Index = { ids: string[]; vecs: Float32Array[]; norms: Float32Array; sig: string; loadedAt: number };
let INDEX: Index | null = null;
const REFRESH_MS = 60_000;

function norm(v: number[] | Float32Array): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return Math.sqrt(s) || 1;
}

/** Load (and periodically refresh) all product vectors into memory. Cheap for a bounded pharmacy catalogue. */
async function getIndex(): Promise<Index | null> {
  const [meta] = await query<Row>(`select count(*)::int n, coalesce(max(updated_at), 'epoch') m from product_embeddings`);
  const n = Number(meta?.n ?? 0);
  if (n === 0) return null;
  const sig = `${n}:${String(meta?.m ?? "")}`;
  if (INDEX && INDEX.sig === sig && Date.now() - INDEX.loadedAt < REFRESH_MS) return INDEX;

  const rows = await query<Row>(`select medicine_id, embedding from product_embeddings`);
  const ids: string[] = [];
  const vecs: Float32Array[] = [];
  const norms: number[] = [];
  for (const r of rows) {
    const arr = (typeof r.embedding === "string" ? JSON.parse(r.embedding) : r.embedding) as number[];
    if (!Array.isArray(arr) || !arr.length) continue;
    const f = Float32Array.from(arr);
    ids.push(r.medicine_id as string);
    vecs.push(f);
    norms.push(norm(f));
  }
  INDEX = { ids, vecs, norms: Float32Array.from(norms), sig, loadedAt: Date.now() };
  return INDEX;
}

export async function indexReady(): Promise<boolean> {
  const idx = await getIndex();
  return Boolean(idx && idx.ids.length);
}

/** Coverage readout for the admin: how many shoppable products are embedded for semantic search. */
export async function embeddingStats(): Promise<{ active: number; embedded: number; pending: number; model: string; aiEnabled: boolean }> {
  const [a] = await query<Row>(`select count(*)::int n from medicines where status = 'active'`);
  const [e] = await query<Row>(`select count(*)::int n from product_embeddings pe join medicines m on m.id = pe.medicine_id where m.status = 'active'`);
  const active = Number(a?.n ?? 0);
  const embedded = Number(e?.n ?? 0);
  return { active, embedded, pending: Math.max(0, active - embedded), model: geminiEmbedModel(), aiEnabled: aiEnabled() };
}

/** Return the top-K most similar product ids for a query vector, by cosine similarity. */
export async function cosineTopK(queryVec: number[], k: number, minScore = 0.55): Promise<{ id: string; score: number }[]> {
  const idx = await getIndex();
  if (!idx) return [];
  const q = Float32Array.from(queryVec);
  const qn = norm(q);
  const scores: { id: string; score: number }[] = [];
  for (let i = 0; i < idx.ids.length; i++) {
    const v = idx.vecs[i];
    const len = Math.min(v.length, q.length);
    let dot = 0;
    for (let j = 0; j < len; j++) dot += v[j] * q[j];
    const score = dot / (idx.norms[i] * qn);
    if (score >= minScore) scores.push({ id: idx.ids[i], score });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, k);
}
