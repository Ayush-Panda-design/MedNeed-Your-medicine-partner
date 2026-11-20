"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import type { Quote } from "@/server/orders/quote";

export type QuoteSettings = {
  shopName: string; phone?: string; deliveryEnabled: boolean; pickupEnabled: boolean; minOrder: number; freeRadiusKm: number; maxRadiusKm: number; perKmRate: number;
  feeBands: { below: number; fee: number }[]; slots: string[]; maxQtyPerLine: number; [k: string]: unknown;
};
export type PrescriptionHint = { required: boolean; state: "none" | "pending" | "verified" | "short"; message: string | null };
export type QuoteResponse = { quote: Quote; prescription: PrescriptionHint; settings: QuoteSettings; codEnabled: boolean; codMax: number; onlineEnabled: boolean };
export type QuoteParams = { fulfilment: "delivery" | "pickup"; addressId?: string | null; couponCode?: string; prescriptionIds?: string[] };

/** Asks the server to price the basket. Prices, fees and stock always come from the server, never from the browser. */
export function useQuote(items: { slug: string; qty: number }[], p: QuoteParams) {
  const [data, setData] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify([items, p.fulfilment, p.addressId ?? null, p.couponCode ?? "", p.prescriptionIds ?? []]);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (items.length === 0) { setData(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await api<QuoteResponse>("/api/checkout/quote", { body: { items, fulfilment: p.fulfilment, addressId: p.addressId || undefined, couponCode: p.couponCode || undefined, prescriptionIds: p.prescriptionIds?.length ? p.prescriptionIds : undefined } });
      if (cancelled) return;
      if (res.ok) { setData(res.data); setError(""); } else setError(res.error);
      setLoading(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  return { data, error, loading, reload: () => setNonce((n) => n + 1) };
}
