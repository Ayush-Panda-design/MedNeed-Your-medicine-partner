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
      await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    } finally {
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
