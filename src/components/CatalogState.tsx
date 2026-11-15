"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/*
 * Shared state for the catalogue's filters and sort.
 *
 * Why: filters used to navigate on every click and read their checked state back from the URL, so a box only
 * changed after the server answered, quick clicks were computed from a stale URL (undoing each other), and every
 * click added a history entry. Now:
 *   - the controls update instantly from local state (optimistic);
 *   - quick successive changes are combined into one navigation (short debounce);
 *   - the navigation runs as a transition with router.replace, so the old results stay on screen (dimmed via
 *     `pending`) until the new ones arrive, and Back still leaves the page instead of undoing each tick;
 *   - when the URL changes from outside (Back/Forward, a link), the controls follow it.
 */

const DEBOUNCE_MS = 220;

type Ctx = {
  params: URLSearchParams;
  update: (mutate: (p: URLSearchParams) => void) => void;
  clear: () => void;
  pending: boolean;
};

const CatalogCtx = createContext<Ctx | null>(null);

export function CatalogStateProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();
  const urlKey = urlParams.toString();

  const [draft, setDraft] = useState(() => new URLSearchParams(urlKey));
  const draftRef = useRef(draft);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [navPending, startTransition] = useTransition();
  const [queued, setQueued] = useState(false);

  // Follow the URL when it changes (our own navigation landing, or Back/Forward), unless newer local edits are queued.
  useEffect(() => {
    if (timer.current) return;
    const next = new URLSearchParams(urlKey);
    draftRef.current = next;
    setDraft(next);
  }, [urlKey]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const navigate = useCallback(
    (next: URLSearchParams) => {
      draftRef.current = next;
      setDraft(next);
      setQueued(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        setQueued(false);
        const qs = draftRef.current.toString();
        startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
      }, DEBOUNCE_MS);
    },
    [pathname, router],
  );

  const update = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(draftRef.current.toString());
      mutate(next);
      next.delete("page");
      navigate(next);
    },
    [navigate],
  );

  const clear = useCallback(() => {
    const next = new URLSearchParams();
    const q = draftRef.current.get("q");
    if (q) next.set("q", q);
    navigate(next);
  }, [navigate]);

  const value = useMemo(() => ({ params: draft, update, clear, pending: navPending || queued }), [draft, update, clear, navPending, queued]);
  return <CatalogCtx.Provider value={value}>{children}</CatalogCtx.Provider>;
}

export function useCatalogState() {
  return useContext(CatalogCtx);
}

/** Wraps the results: keeps them visible but dimmed (and marked busy) while new results load. */
export function CatalogResults({ children, className }: { children: ReactNode; className?: string }) {
  const pending = useCatalogState()?.pending ?? false;
  return (
    <section
      aria-label="Product results"
      aria-busy={pending || undefined}
      data-pending={pending || undefined}
      className={`${className ?? ""} transition-opacity duration-200 ${pending ? "pointer-events-none opacity-60" : "opacity-100"}`}
    >
      {children}
    </section>
  );
}
