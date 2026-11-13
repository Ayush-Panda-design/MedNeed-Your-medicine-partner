"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "./catalog";

type CartLine = { slug: string; qty: number };

type CartCtx = {
  lines: { product: Product; qty: number }[];
  /** True until the cart items have been loaded with their current prices. */
  loading: boolean;
  /** True if the last attempt to load current prices failed. */
  loadFailed: boolean;
  retry: () => void;
  count: number;
  subtotal: number;
  mrpTotal: number;
  hasRx: boolean;
  /** Pass the product when you have it so the cart can show it immediately. */
  add: (slug: string, qty?: number, product?: Product) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  avatarUrl: string | null;
  roles: string[];
  hasPassword: boolean;
  tfa: boolean;
  isStaff: boolean;
  isDelivery?: boolean;
};

type AuthCtx = {
  user: AuthUser | null;
  ready: boolean;
  /** Re-read the session from the server (call after sign-in, profile changes). */
  refresh: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
};

const CartContext = createContext<CartCtx | null>(null);
const AuthContext = createContext<AuthCtx | null>(null);

const CART_KEY = "medneed_cart_v1";
/** Whose cart is in this browser: a user id, or "" for a guest cart. */
const OWNER_KEY = "medneed_cart_owner_v1";

/** Combine two carts: one line per product, keeping the larger quantity (so re-merging never doubles a cart). */
function mergeLines(a: CartLine[], b: CartLine[]): CartLine[] {
  const m = new Map<string, number>();
  for (const l of [...a, ...b]) m.set(l.slug, Math.min(10, Math.max(m.get(l.slug) ?? 0, l.qty)));
  return Array.from(m, ([slug, qty]) => ({ slug, qty })).slice(0, 50);
}

const sameLines = (a: CartLine[], b: CartLine[]) => a.length === b.length && a.every((l, i) => l.slug === b[i].slug && l.qty === b[i].qty);

async function putCart(items: CartLine[], keepalive = false) {
  const res = await fetch("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }), keepalive });
  if (!res.ok) throw new Error(`cart save failed (${res.status})`);
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep in-memory state only */
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [raw, setRaw] = useState<CartLine[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const known = useRef<Record<string, Product>>({});
  const rawRef = useRef<CartLine[]>([]);
  rawRef.current = raw;
  /** The user whose saved cart has been merged into this browser's cart; changes are saved for them. */
  const syncedFor = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await res.json()) as { user: AuthUser | null };
      setUser(data.user);
      return data.user;
    } catch {
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    // Hydrate after mount to avoid server/client markup mismatch.
    setRaw(readStorage<CartLine[]>(CART_KEY, []));
    setCartReady(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (cartReady) writeStorage(CART_KEY, raw);
  }, [raw, cartReady]);

  /*
   * Guest vs account cart.
   * - Guests keep a cart in this browser only.
   * - On sign-in, the guest cart is merged into the account's saved cart, so it follows the user to other devices.
   *   A cart left in the browser by a *different* account is never merged into this one.
   * - On sign-out (or when the session has ended), the account's cart is removed from this browser; it stays saved
   *   on the account. So the next person using the device never sees someone else's medicines.
   */
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!ready || !cartReady) return;
    const owner = readStorage<string>(OWNER_KEY, "");
    if (!userId) {
      syncedFor.current = null;
      if (owner) {
        setRaw([]);
        writeStorage(OWNER_KEY, "");
      }
      return;
    }
    if (syncedFor.current === userId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cart", { cache: "no-store" });
        if (!res.ok) throw new Error(`cart load failed (${res.status})`);
        const saved = ((await res.json()) as { items: CartLine[] }).items ?? [];
        if (cancelled) return;
        const local = owner && owner !== userId ? [] : rawRef.current;
        const merged = mergeLines(saved, local);
        writeStorage(OWNER_KEY, userId);
        syncedFor.current = userId;
        setRaw(merged);
        if (!sameLines(merged, saved)) await putCart(merged).catch(() => {});
      } catch {
        // Offline or server error: keep the browser cart; the merge is retried on the next sign-in or page load.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, cartReady, userId]);

  // Save the signed-in user's cart after each change (debounced).
  useEffect(() => {
    if (!userId || syncedFor.current !== userId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void putCart(rawRef.current).catch(() => {});
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [raw, userId]);

  // Leaving the page with a save still pending: send it anyway.
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current && syncedFor.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void putCart(rawRef.current, true).catch(() => {});
      }
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  // Current prices and availability come from the server, never from what was saved in the browser.
  const slugKey = useMemo(() => raw.map((l) => l.slug).sort().join(","), [raw]);
  useEffect(() => {
    if (!cartReady) return;
    const slugs = slugKey ? slugKey.split(",") : [];
    const missing = slugs.filter((x) => !known.current[x]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/catalog/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugs: missing }),
          cache: "no-store",
        });
        if (!res.ok) throw new Error("lookup failed");
        const data = (await res.json()) as { products: Product[] };
        if (cancelled) return;
        for (const p of data.products) known.current[p.slug] = p;
        setProducts({ ...known.current });
        // Items that are no longer for sale are dropped from the cart.
        const found = new Set(data.products.map((p) => p.slug));
        setRaw((prev) => prev.filter((l) => !missing.includes(l.slug) || found.has(l.slug)));
        setLoadFailed(false);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slugKey, cartReady, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const add = useCallback((slug: string, qty = 1, product?: Product) => {
    if (product) {
      known.current[slug] = product;
      setProducts({ ...known.current });
    }
    setRaw((prev) => {
      const found = prev.find((l) => l.slug === slug);
      if (found) return prev.map((l) => (l.slug === slug ? { ...l, qty: Math.min(l.qty + qty, 10) } : l));
      return [...prev, { slug, qty: Math.min(qty, 10) }];
    });
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    setRaw((prev) =>
      qty <= 0 ? prev.filter((l) => l.slug !== slug) : prev.map((l) => (l.slug === slug ? { ...l, qty: Math.min(qty, 10) } : l)),
    );
  }, []);

  const remove = useCallback((slug: string) => setRaw((prev) => prev.filter((l) => l.slug !== slug)), []);
  const clear = useCallback(() => setRaw([]), []);

  const cart = useMemo<CartCtx>(() => {
    const lines = raw
      .map((l) => ({ product: products[l.slug], qty: l.qty }))
      .filter((l): l is { product: Product; qty: number } => Boolean(l.product));
    return {
      lines,
      loading: !cartReady || (!loadFailed && raw.some((l) => !products[l.slug])),
      loadFailed,
      retry,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + l.product.price * l.qty, 0),
      mrpTotal: lines.reduce((n, l) => n + l.product.mrp * l.qty, 0),
      hasRx: lines.some((l) => l.product.rx),
      add,
      setQty,
      remove,
      clear,
    };
  }, [raw, products, cartReady, loadFailed, retry, add, setQty, remove, clear]);

  const signOut = useCallback(async () => {
    try {
      // Save any pending cart change to the account before the session ends.
      if (saveTimer.current && syncedFor.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        await putCart(rawRef.current).catch(() => {});
      }
      await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    } finally {
      syncedFor.current = null;
      setRaw([]);
      writeStorage(OWNER_KEY, "");
      setUser(null);
    }
  }, []);

  const auth = useMemo<AuthCtx>(() => ({ user, ready, refresh, signOut }), [user, ready, refresh, signOut]);

  return (
    <AuthContext.Provider value={auth}>
      <CartContext.Provider value={cart}>{children}</CartContext.Provider>
    </AuthContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <Providers>");
  return ctx;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <Providers>");
  return ctx;
}
