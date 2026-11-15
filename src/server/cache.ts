// Small in-process cache for public, slow-changing reads (category lists, brand lists, result counts).
// Each server instance keeps its own copy for a short time; nothing personal is ever stored here.
type Entry = { at: number; ttl: number; value: Promise<unknown> };
const store = new Map<string, Entry>();
const MAX = 500;

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < hit.ttl) return hit.value as Promise<T>;
  const value = load();
  store.set(key, { at: now, ttl: ttlMs, value });
  value.catch(() => store.delete(key)); // never cache a failure
  if (store.size > MAX) store.delete(store.keys().next().value as string);
  return value;
}

/** Drop cached catalogue reads (call after admin edits so the shop updates at once on this instance). */
export function clearCache(prefix = "") {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
