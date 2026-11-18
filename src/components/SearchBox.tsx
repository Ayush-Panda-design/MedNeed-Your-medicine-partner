"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, Plus, Search, ShieldAlert, Sparkles, Upload, X } from "lucide-react";
import { ProductVisual } from "@/components/ProductVisual";
import { formatINR } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";
import { useCart } from "@/lib/providers";

const HINTS = [
  "Search for medicines, health products and more",
  "Try “Dolo 650” or “paracetamol”",
  "Search by symptom, like “acidity”",
  "Search vitamins & supplements",
  "Looking for baby care?",
  "Upload a prescription instead",
];
// Phones: the same ideas in words short enough to fit the field without being cut off.
const SHORT_HINTS = ["Search medicines", "Try “Dolo 650”", "Search by symptom", "Vitamins & supplements", "Baby care", "Upload a prescription"];
const PLAIN_HINT = HINTS[0];
const RECENT_KEY = "medneed_recent_searches";
const POPULAR = ["Dolo 650", "Paracetamol", "Vitamin D", "ORS", "Cetirizine", "Pantoprazole"];
const CONCERNS = ["Fever", "Acidity", "Cold & cough", "Diabetes", "Skin care", "Baby care", "Joint pain"];

type Styles = { box: string; icon: string; input: string };
type Row = { kind: "product"; product: Product } | { kind: "all" };

function readRecent(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 6) : [];
  } catch { return []; }
}
function writeRecent(list: string[]) {
  try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6))); } catch { /* storage unavailable: recents just aren't kept */ }
}

/** Bold the part of the name that matches what was typed. */
function Highlight({ text, term }: { text: string; term: string }) {
  const t = term.trim();
  const i = t ? text.toLowerCase().indexOf(t.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded bg-transparent font-bold text-teal-700">{text.slice(i, i + t.length)}</mark>{text.slice(i + t.length)}</>;
}

/**
 * Header search with a focus panel (recent, popular, shop-by-concern), live product results while typing,
 * a typewriter placeholder and a "/" shortcut. Submitting still goes to /medicines?q=… exactly as before.
 */
export function SearchBox({ styles, overlay }: { styles: Styles; overlay: boolean }) {
  const router = useRouter();
  const cart = useCart();
  const uid = useId();
  const listId = `${uid}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [settled, setSettled] = useState("");     // the query the shown results belong to
  const [failed, setFailed] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const [ph, setPh] = useState(PLAIN_HINT);
  const cache = useRef(new Map<string, { items: Product[]; total: number }>());
  const term = q.trim();
  const live = term.length >= 2;

  // ── typewriter placeholder (only while idle and empty; static for reduced-motion) ──
  useEffect(() => {
    if (q || open) return;
    const hints = window.matchMedia?.("(max-width: 480px)").matches ? SHORT_HINTS : HINTS;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setPh(hints[0]); return; }
    let i = 0, n = 0, dir = 1, timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const text = hints[i];
      n += dir;
      setPh(text.slice(0, n) || " ");
      if (dir === 1 && n >= text.length) { dir = -1; timer = setTimeout(tick, 1700); return; }
      if (dir === -1 && n <= 0) { dir = 1; i = (i + 1) % hints.length; timer = setTimeout(tick, 350); return; }
      timer = setTimeout(tick, dir === 1 ? 55 : 24);
    };
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, [q, open]);

  // ── "/" focuses the search from anywhere ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── close on outside click ──
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || (t as HTMLElement).closest?.("[data-sb-backdrop]")) {
        if (!wrapRef.current?.contains(t)) setOpen(false);
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // ── live results (debounced, cancellable, cached) ──
  useEffect(() => {
    if (!live) { setItems([]); setTotal(0); setLoading(false); setFailed(false); setSettled(""); return; }
    const hit = cache.current.get(term.toLowerCase());
    if (hit) { setItems(hit.items); setTotal(hit.total); setSettled(term); setLoading(false); setFailed(false); return; }
    setLoading(true);
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/catalog/suggest?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { items: Product[]; total: number };
        cache.current.set(term.toLowerCase(), data);
        if (cache.current.size > 40) cache.current.delete(cache.current.keys().next().value as string);
        setItems(data.items); setTotal(data.total); setSettled(term); setFailed(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      } finally {
        if (!ctl.signal.aborted) setLoading(false);
      }
    }, 170);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [term, live]);

  useEffect(() => { setActive(-1); }, [term, open]);

  const rows: Row[] = useMemo(() => (live ? [...items.map((product) => ({ kind: "product" as const, product })), ...(term ? [{ kind: "all" as const }] : [])] : []), [live, items, term]);

  const remember = useCallback((s: string) => {
    const v = s.trim();
    if (!v) return;
    const next = [v, ...readRecent().filter((r) => r.toLowerCase() !== v.toLowerCase())].slice(0, 6);
    writeRecent(next); setRecent(next);
  }, []);

  const go = useCallback((s: string) => {
    const v = s.trim();
    remember(v);
    setOpen(false);
    inputRef.current?.blur();
    router.push(v ? `/medicines?q=${encodeURIComponent(v)}` : "/medicines");
  }, [remember, router]);

  const openProduct = (p: Product) => {
    remember(term);
    setOpen(false);
    inputRef.current?.blur();
    router.push(`/medicines/${p.slug}`);
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const row = rows[active];
    if (row?.kind === "product") return openProduct(row.product);
    go(term);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { if (open) { e.preventDefault(); setOpen(false); } else inputRef.current?.blur(); return; }
    if (!rows.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % rows.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? rows.length - 1 : a - 1)); }
  }

  function addToCart(p: Product, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    cart.add(p.slug, 1, p);
    setAdded(p.id);
    setTimeout(() => setAdded((a) => (a === p.id ? null : a)), 1200);
  }

  const showEmptyPanel = open && !live;
  const showResults = open && live;
  const stale = loading && settled !== term;
  const activeId = active >= 0 ? `${uid}-opt-${active}` : undefined;

  return (
    <div ref={wrapRef} className="relative w-full">
      {open && typeof document !== "undefined" && createPortal(
        <div data-sb-backdrop aria-hidden className="mn-sb-backdrop fixed inset-0 z-30 bg-slate-900/25 backdrop-blur-[2px]" />, document.body)}

      <form onSubmit={onSubmit} role="search" className="flex w-full">
        <label htmlFor="site-search" className="sr-only">Search medicines</label>
        <div className="mn-sb w-full" data-overlay={overlay} data-open={open}>
          <div className={`mn-sb-inner flex w-full items-center rounded-xl border ${styles.box}`}>
            <Search className={`ml-3 h-5 w-5 shrink-0 ${styles.icon}`} />
            <input
              ref={inputRef}
              id="site-search"
              value={q}
              autoComplete="off"
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onFocus={() => { setRecent(readRecent()); setOpen(true); }}
              onKeyDown={onKeyDown}
              placeholder={ph}
              className={`w-full min-w-0 bg-transparent px-3 py-2.5 text-sm outline-none ${styles.input}`}
            />
            {q && (
              <button type="button" aria-label="Clear search" onClick={() => { setQ(""); inputRef.current?.focus(); }} className={`mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-full ${styles.icon} hover:bg-black/5`}>
                <X className="h-4 w-4" />
              </button>
            )}
            {!q && !open && <kbd aria-hidden className={`mr-2 hidden h-6 min-w-6 shrink-0 place-items-center rounded-md border px-1.5 text-xs font-semibold md:grid ${overlay ? "border-white/40 text-white/80" : "border-slate-300 text-slate-500"}`}>/</kbd>}
            <button type="submit" data-fx="ripple" className="mn-fx-ripple m-1 shrink-0 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white sm:py-1.5 hover:bg-teal-700">
              Search
            </button>
          </div>
        </div>
      </form>

      {open && (
        <div id={listId} role="listbox" aria-label="Search suggestions" className="mn-sb-panel absolute left-0 right-0 top-full z-50 mt-2 max-h-[72vh] overflow-y-auto rounded-card border border-line bg-surface p-2 text-ink shadow-card-hover">
          {showEmptyPanel && (
            <div className="space-y-4 p-2">
              {recent.length > 0 && (
                <section>
                  <div className="mb-1.5 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Recent searches</h3>
                    <button type="button" onClick={() => { writeRecent([]); setRecent([]); }} className="text-xs text-ink-2 hover:text-teal-700">Clear</button>
                  </div>
                  <ul>
                    {recent.map((r, i) => (
                      <li key={r} className="mn-sb-row group flex items-center" style={{ animationDelay: `${i * 30}ms` }}>
                        <button type="button" onClick={() => { setQ(r); go(r); }} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-control px-2 py-2 text-left text-sm hover:bg-subtle">
                          <Clock className="h-4 w-4 shrink-0 text-ink-muted" /><span className="truncate">{r}</span>
                        </button>
                        <button type="button" aria-label={`Remove ${r} from recent searches`} onClick={() => { const n = recent.filter((x) => x !== r); writeRecent(n); setRecent(n); }} className="grid h-8 w-8 place-items-center rounded-full text-ink-muted opacity-0 hover:bg-subtle focus-visible:opacity-100 group-hover:opacity-100">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section>
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Popular searches</h3>
                <div className="flex flex-wrap gap-2">
                  {POPULAR.map((p, i) => (
                    <button key={p} type="button" onClick={() => { setQ(p); go(p); }} className="mn-sb-row rounded-full border border-line bg-surface px-3 py-1.5 text-sm hover:border-teal-500 hover:bg-tint hover:text-tint-fg" style={{ animationDelay: `${i * 30}ms` }}>{p}</button>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Shop by concern</h3>
                <div className="flex flex-wrap gap-2">
                  {CONCERNS.map((p, i) => (
                    <button key={p} type="button" onClick={() => { setQ(p); go(p); }} className="mn-sb-row rounded-full bg-tint px-3 py-1.5 text-sm font-medium text-tint-fg hover:brightness-95" style={{ animationDelay: `${(i + 3) * 30}ms` }}>{p}</button>
                  ))}
                </div>
              </section>
              <Link href="/account/prescriptions/new" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-control border border-dashed border-line-strong px-3 py-2.5 text-sm hover:bg-subtle">
                <Upload className="h-4 w-4 text-teal-600" />
                <span><span className="font-semibold">Have a prescription?</span> <span className="text-ink-2">Upload it and we&apos;ll do the rest.</span></span>
              </Link>
            </div>
          )}

          {showResults && (
            <div aria-busy={stale}>
              {failed && !items.length && <p className="px-3 py-4 text-sm text-ink-2">Suggestions are unavailable right now. Press Enter to search.</p>}
              {!failed && !loading && settled === term && items.length === 0 && (
                <div className="px-3 py-4 text-sm">
                  <p className="font-medium">No exact matches for “{term}”.</p>
                  <p className="mt-0.5 flex items-start gap-1.5 text-ink-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" /> Press Enter to search the full catalogue. It also looks for related medicines.</p>
                </div>
              )}
              {loading && items.length === 0 && (
                <div className="space-y-2 p-1" aria-label="Searching">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-control p-2">
                      <div className="mn-skeleton h-12 w-12 shrink-0 rounded-lg" />
                      <div className="flex-1 space-y-2"><div className="mn-skeleton h-4 w-2/3" /><div className="mn-skeleton h-3 w-1/3" /></div>
                    </div>
                  ))}
                </div>
              )}
              {items.length > 0 && (
                <ul className={stale ? "opacity-60 transition-opacity" : "transition-opacity"}>
                  {items.map((p, i) => {
                    const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
                    const canAdd = p.orderable && p.inStock && !p.restricted;
                    return (
                      <li key={p.id} id={`${uid}-opt-${i}`} role="option" aria-selected={active === i} className="mn-sb-row" style={{ animationDelay: `${i * 35}ms` }}>
                        <div
                          onMouseEnter={() => setActive(i)}
                          className={`flex items-center gap-3 rounded-control p-2 ${active === i ? "bg-subtle" : ""}`}
                        >
                          <Link href={`/medicines/${p.slug}`} onClick={() => { remember(term); setOpen(false); }} className="flex min-w-0 flex-1 items-center gap-3">
                            <ProductVisual product={p} art="icon" className="h-12 w-12 shrink-0 rounded-lg" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold"><Highlight text={p.name} term={term} /></span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-2">
                                <span className="truncate">{p.packSize}</span>
                                {p.rx && <span className="inline-flex items-center gap-1 font-semibold text-rose-600"><ShieldAlert className="h-3 w-3" />Rx</span>}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              {p.orderable ? (
                                <>
                                  <span className="block text-sm font-bold tabular-nums">{formatINR(p.price)}</span>
                                  {off > 0 && <span className="text-[11px] font-semibold text-chip-fg">{off}% off</span>}
                                </>
                              ) : <span className="text-xs text-ink-muted">View details</span>}
                            </span>
                          </Link>
                          {canAdd && (
                            <button
                              type="button"
                              aria-label={`Add ${p.name} to cart`}
                              onClick={(e) => addToCart(p, e)}
                              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors ${added === p.id ? "border-teal-600 bg-teal-600 text-white" : "border-teal-600 text-teal-700 hover:bg-tint"}`}
                            >
                              {added === p.id ? <span aria-hidden className="text-sm font-bold">✓</span> : <Plus className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {term && (
                <div id={`${uid}-opt-${items.length}`} role="option" aria-selected={active === items.length} className="mt-1 border-t border-line pt-1">
                  <button type="button" onMouseEnter={() => setActive(items.length)} onClick={() => go(term)} className={`flex w-full items-center justify-between rounded-control px-3 py-2.5 text-left text-sm font-semibold text-teal-700 ${active === items.length ? "bg-subtle" : "hover:bg-subtle"}`}>
                    <span className="truncate">See all results for “{term}”{total > items.length ? ` (${total.toLocaleString("en-IN")})` : ""}</span>
                    <span aria-hidden>↵</span>
                  </button>
                </div>
              )}
            </div>
          )}
          <p className="sr-only" role="status" aria-live="polite">{showResults && settled === term ? `${total} results` : ""}</p>
          {open && (
            <p aria-hidden className="mt-1 hidden items-center justify-end gap-3 px-2 pb-1 pt-1 text-[11px] text-ink-muted md:flex">
              <span><kbd className="rounded border border-line px-1">↑</kbd> <kbd className="rounded border border-line px-1">↓</kbd> to move</span>
              <span><kbd className="rounded border border-line px-1">Enter</kbd> to open</span>
              <span><kbd className="rounded border border-line px-1">Esc</kbd> to close</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
