"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getProduct, type Product } from "./data";

type CartLine = { slug: string; qty: number };

type CartCtx = {
  lines: { product: Product; qty: number }[];
  count: number;
  subtotal: number;
  mrpTotal: number;
  hasRx: boolean;
  add: (slug: string, qty?: number) => void;
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

  const add = useCallback((slug: string, qty = 1) => {
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
      .map((l) => ({ product: getProduct(l.slug), qty: l.qty }))
      .filter((l): l is { product: Product; qty: number } => Boolean(l.product));
    return {
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + l.product.price * l.qty, 0),
      mrpTotal: lines.reduce((n, l) => n + l.product.mrp * l.qty, 0),
      hasRx: lines.some((l) => l.product.rx),
      add,
      setQty,
      remove,
      clear,
    };
  }, [raw, add, setQty, remove, clear]);

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
