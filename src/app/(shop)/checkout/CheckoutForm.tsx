"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Plus, ShieldAlert, Store, Truck } from "lucide-react";
import { AddressForm, emptyAddress } from "@/components/AddressForm";
import { api } from "@/lib/api";
import type { Address } from "@/lib/addresses";
import { formatINR } from "@/lib/catalog";
import { useAuth, useCart } from "@/lib/providers";
import { useQuote } from "@/lib/useQuote";
import { payForOrder } from "@/lib/razorpay-client";
import { PrescriptionPicker } from "./PrescriptionPicker";

const card = "rounded-2xl border border-slate-200 bg-white p-5";
const field = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

function dayOptions(n = 3) {
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ value, label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) });
  }
  return out;
}
const windowLabel = (w: string) => w.replace("-", " – ");

export function CheckoutForm({ initialAddresses }: { initialAddresses: Address[] }) {
  const router = useRouter();
  const cart = useCart();
  const auth = useAuth();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [fulfilment, setFulfilment] = useState<"delivery" | "pickup">("delivery");
  const [addressId, setAddressId] = useState<string | null>(initialAddresses.find((a) => a.isDefault)?.id ?? initialAddresses[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const [contact, setContact] = useState({ name: auth.user?.name ?? "", phone: (auth.user?.phone ?? "").replace(/\D/g, "").slice(-10) });
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [slotDate, setSlotDate] = useState("");
  const [slotWindow, setSlotWindow] = useState("");
  const [payment, setPayment] = useState<"cod" | "pay_at_store" | "online">("cod");
  const [note, setNote] = useState("");
  const [rxIds, setRxIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const idemKey = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

  useEffect(() => { if (auth.user && !contact.name) setContact((c) => ({ ...c, name: auth.user?.name ?? "" })); }, [auth.user, contact.name]);

  const items = useMemo(() => cart.lines.map((l) => ({ slug: l.product.slug, qty: l.qty })), [cart.lines]);
  const { data, error: quoteError, loading, reload } = useQuote(items, { fulfilment, addressId: fulfilment === "delivery" ? addressId : null, couponCode: appliedCoupon, prescriptionIds: rxIds });
  const quote = data?.quote;
  const rxHint = data?.prescription;
  const cartRx = (quote?.lines ?? []).filter((l) => l.rx).map((l) => ({ slug: l.slug, name: l.name, qty: l.qty }));
  const settings = data?.settings;

  // Pick a valid payment method whenever the way of receiving the order changes.
  useEffect(() => {
    if (!data) return;
    if (fulfilment === "pickup") setPayment((p) => (p === "online" && data.onlineEnabled ? "online" : "pay_at_store"));
    else setPayment((p) => (p === "pay_at_store" ? (data.codEnabled ? "cod" : data.onlineEnabled ? "online" : "cod") : p));
  }, [fulfilment, data]);
  useEffect(() => { if (settings && fulfilment === "delivery" && !settings.deliveryEnabled && settings.pickupEnabled) setFulfilment("pickup"); }, [settings, fulfilment]);

  if (cart.loading) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-500" aria-busy="true">Loading your cart…</main>;
  if (cart.lines.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link href="/medicines" className="mt-6 inline-block rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700">Browse medicines</Link>
      </main>
    );
  }

  const slotDays = dayOptions();
  const needsContact = fulfilment === "pickup";
  const contactOk = !needsContact || (contact.name.trim().length >= 2 && /^[6-9]\d{9}$/.test(contact.phone));
  const canPlace = !!quote && quote.canCheckout && !loading && !busy && contactOk && (fulfilment === "pickup" || !!addressId) && (!slotDate === !slotWindow) && (!rxHint?.required || rxHint.state === "verified" || rxHint.state === "pending");
  const problems = quote?.problems ?? [];

  async function place() {
    if (!quote) return;
    setBusy(true);
    setError("");
    const res = await api<{ id: string; status: string }>("/api/checkout/orders", {
      body: {
        items, fulfilment, addressId: fulfilment === "delivery" ? addressId : null, contact: needsContact ? { name: contact.name.trim(), phone: contact.phone } : null,
        couponCode: appliedCoupon || undefined, paymentMethod: payment, slotDate: slotDate || null, slotWindow: slotWindow || null,
        customerNote: note.trim() || undefined, prescriptionIds: rxHint?.required ? rxIds : undefined, expectedTotal: quote.total, idempotencyKey: idemKey.current,
      },
    });
    if (!res.ok) {
      setBusy(false);
      // A new attempt after a rejected one gets a fresh key; only a retry of the *same* attempt is deduplicated.
      if (res.code === "price_changed" || res.code?.startsWith("rx_") || res.status === 409) { reload(); idemKey.current = crypto.randomUUID(); }
      return setError(res.error);
    }
    cart.clear();
    if (payment === "online") {
      // The order now holds the stock. Open the payment window; if the customer closes it, the order page lets them pay again.
      const paid = await payForOrder(res.data.id);
      router.replace(`/account/orders/${res.data.id}${paid.ok ? "?placed=1&paid=1" : "?placed=1"}`);
      return;
    }
    router.replace(`/account/orders/${res.data.id}?placed=1`);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <ol className="mt-4 flex items-center gap-2 text-xs font-semibold sm:gap-3 sm:text-sm" aria-label="Checkout steps">
        {["Cart", "Delivery & payment", "Confirm"].map((label, i) => (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            <span className={`flex items-center gap-2 ${i === 1 ? "text-teal-700" : i < 1 ? "text-slate-500" : "text-slate-400"}`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${i === 1 ? "bg-teal-600 text-white" : i < 1 ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400"}`}>{i < 1 ? "\u2713" : i + 1}</span>
              <span className="hidden sm:inline">{label}</span>
            </span>
            {i < 2 && <span aria-hidden className="h-px w-5 bg-slate-200 sm:w-8" />}
          </li>
        ))}
      </ol>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className={card} aria-label="How you get your order">
            <h2 className="font-bold">How would you like to get your order?</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {settings?.deliveryEnabled !== false && (
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${fulfilment === "delivery" ? "border-teal-600 bg-teal-50" : "border-slate-300"}`}>
                  <input type="radio" name="fulfilment" checked={fulfilment === "delivery"} onChange={() => setFulfilment("delivery")} className="mt-1 accent-teal-600" />
                  <span><span className="flex items-center gap-2 font-semibold"><Truck className="h-4 w-4" /> Home delivery</span>
                    <span className="mt-1 block text-sm text-slate-600">Within {settings?.maxRadiusKm ?? 15} km{settings ? `, minimum order ${formatINR(settings.minOrder)}` : ""}</span></span>
                </label>
              )}
              {settings?.pickupEnabled !== false && (
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${fulfilment === "pickup" ? "border-teal-600 bg-teal-50" : "border-slate-300"}`}>
                  <input type="radio" name="fulfilment" checked={fulfilment === "pickup"} onChange={() => setFulfilment("pickup")} className="mt-1 accent-teal-600" />
                  <span><span className="flex items-center gap-2 font-semibold"><Store className="h-4 w-4" /> Store pickup</span>
                    <span className="mt-1 block text-sm text-slate-600">No fee and no minimum. Collect from the shop.</span></span>
                </label>
              )}
            </div>
          </section>

          {fulfilment === "delivery" ? (
            <section className={card} aria-label="Delivery address">
              <h2 className="font-bold">Delivery address</h2>
              {addresses.length === 0 && !adding && <p className="mt-2 text-sm text-slate-600">You have no saved address yet. Add one to continue.</p>}
              <ul className="mt-3 space-y-3">
                {addresses.map((a) => (
                  <li key={a.id}>
                    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${addressId === a.id ? "border-teal-600 bg-teal-50" : "border-slate-300"}`}>
                      <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1 accent-teal-600" />
                      <span className="text-sm">
                        <span className="flex items-center gap-2 font-semibold capitalize"><MapPin className="h-4 w-4 text-teal-600" /> {a.label} · {a.fullName}</span>
                        <span className="mt-1 block text-slate-600">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.pincode} · +91 {a.phone}</span>
                        {a.lat == null && <span className="mt-1 block text-xs text-slate-500">No shared location. Distance is estimated from the pincode.</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {adding ? (
                <AddressForm initial={{ ...emptyAddress, fullName: auth.user?.name ?? "", isDefault: addresses.length === 0 }} editingId={null}
                  onSaved={(a) => { setAddresses((l) => [...l.map((x) => (a.isDefault ? { ...x, isDefault: false } : x)), a]); setAddressId(a.id); setAdding(false); }}
                  onCancel={() => setAdding(false)} />
              ) : (
                <button type="button" onClick={() => setAdding(true)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"><Plus className="h-4 w-4" /> Add a new address</button>
              )}
            </section>
          ) : (
            <section className={card} aria-label="Who is collecting">
              <h2 className="font-bold">Who will collect the order?</h2>
              {settings && <p className="mt-1 text-sm text-slate-600">Collect from {settings.shopName}. We will keep it ready for you.</p>}
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="c-name" className="text-sm font-medium">Name</label><input id="c-name" className={`${field} mt-1.5`} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} autoComplete="name" /></div>
                <div><label htmlFor="c-phone" className="text-sm font-medium">Mobile number</label><input id="c-phone" inputMode="numeric" maxLength={10} className={`${field} mt-1.5`} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value.replace(/\D/g, "") })} autoComplete="tel-national" /></div>
              </div>
            </section>
          )}

          {settings && settings.slots.length > 0 && (
            <section className={card} aria-label="Preferred time">
              <h2 className="font-bold">{fulfilment === "delivery" ? "Preferred delivery time" : "Preferred pickup time"} <span className="text-sm font-normal text-slate-500">(optional)</span></h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="s-day" className="text-sm font-medium">Day</label>
                  <select id="s-day" className={`${field} mt-1.5`} value={slotDate} onChange={(e) => { setSlotDate(e.target.value); if (!e.target.value) setSlotWindow(""); }}>
                    <option value="">As soon as possible</option>
                    {slotDays.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="s-win" className="text-sm font-medium">Time</label>
                  <select id="s-win" className={`${field} mt-1.5`} value={slotWindow} disabled={!slotDate} onChange={(e) => setSlotWindow(e.target.value)}>
                    <option value="">Choose a time</option>
                    {settings.slots.map((w) => <option key={w} value={w}>{windowLabel(w)}</option>)}
                  </select>
                </div>
              </div>
              {slotDate && !slotWindow && <p className="mt-2 text-sm text-amber-700">Choose a time, or set the day back to &ldquo;As soon as possible&rdquo;.</p>}
            </section>
          )}

          {rxHint?.required && <PrescriptionPicker cartRx={cartRx} selected={rxIds} onChange={setRxIds} hint={rxHint} />}

          <section className={card} aria-label="Payment">
            <h2 className="font-bold">Payment</h2>
            <div className="mt-3 space-y-3">
              {fulfilment === "pickup" ? (
                <>
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${payment === "pay_at_store" ? "border-teal-600 bg-teal-50" : "border-slate-300"}`}><input type="radio" name="pay" checked={payment === "pay_at_store"} onChange={() => setPayment("pay_at_store")} className="mt-1 accent-teal-600" /><span className="text-sm"><span className="font-semibold">Pay at the store</span><span className="block text-slate-600">Pay when you collect your order.</span></span></label>
                  {data?.onlineEnabled && (
                    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${payment === "online" ? "border-teal-600 bg-teal-50" : "border-slate-300"}`}>
                      <input type="radio" name="pay" checked={payment === "online"} onChange={() => setPayment("online")} className="mt-1 accent-teal-600" />
                      <span className="text-sm"><span className="font-semibold">Pay online now</span><span className="block text-slate-600">Card, UPI or netbanking. Then just collect your order.</span></span>
                    </label>
                  )}
                </>
              ) : (
                <>
                  {data?.codEnabled && (
                    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${payment === "cod" ? "border-teal-600 bg-teal-50" : "border-slate-300"}`}>
                      <input type="radio" name="pay" checked={payment === "cod"} onChange={() => setPayment("cod")} className="mt-1 accent-teal-600" />
                      <span className="text-sm"><span className="font-semibold">Cash or UPI on delivery</span><span className="block text-slate-600">Pay the delivery person when your order arrives (orders up to {formatINR(data.codMax)}).</span></span>
                    </label>
                  )}
                  {data?.onlineEnabled && (
                    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${payment === "online" ? "border-teal-600 bg-teal-50" : "border-slate-300"}`}>
                      <input type="radio" name="pay" checked={payment === "online"} onChange={() => setPayment("online")} className="mt-1 accent-teal-600" />
                      <span className="text-sm"><span className="font-semibold">Pay online</span><span className="block text-slate-600">Card, UPI or netbanking.</span></span>
                    </label>
                  )}
                  {data && !data.codEnabled && !data.onlineEnabled && <p className="text-sm text-rose-700">No payment method is available right now. Please try again later or choose store pickup.</p>}
                  {data && data.codEnabled && quote && quote.total > data.codMax && !data.onlineEnabled && <p className="text-sm text-amber-700">Orders above {formatINR(data.codMax)} cannot be paid on delivery. Please reduce the order or choose store pickup.</p>}
                </>
              )}
            </div>
            <div className="mt-4">
              <label htmlFor="note" className="text-sm font-medium">Note for the pharmacy (optional)</label>
              <textarea id="note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className={`${field} mt-1.5`} />
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-44">
          <div className={card}>
            <h2 className="text-lg font-bold">Order summary</h2>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {(quote?.lines ?? []).map((l) => (
                <li key={l.slug} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0"><span className="block truncate font-medium">{l.name}</span><span className="text-xs text-slate-500">{l.qty} × {formatINR(l.unitPrice)}</span>{l.problem && <span className="block text-xs text-rose-600">{l.problem}</span>}</span>
                  <span className="shrink-0 font-medium">{formatINR(l.lineTotal)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <label htmlFor="coupon" className="text-sm font-medium">Coupon code</label>
              <div className="mt-1.5 flex gap-2">
                <input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} maxLength={30} className={field} placeholder="Enter code" />
                <button type="button" onClick={() => setAppliedCoupon(coupon.trim())} className="rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50">Apply</button>
              </div>
              {quote?.couponError && appliedCoupon && <p role="alert" className="mt-1.5 text-sm text-rose-700">{quote.couponError}</p>}
              {quote?.coupon && <p role="status" className="mt-1.5 text-sm text-emerald-700">{quote.coupon.code} applied: you save {formatINR(quote.coupon.discount)}.</p>}
              {appliedCoupon && <button type="button" onClick={() => { setAppliedCoupon(""); setCoupon(""); }} className="mt-1 text-xs text-slate-500 hover:text-rose-600">Remove coupon</button>}
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-600">Items</dt><dd>{formatINR(quote?.subtotal ?? 0)}</dd></div>
              {quote && quote.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Coupon</dt><dd>− {formatINR(quote.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-slate-600">{fulfilment === "pickup" ? "Pickup" : "Delivery"}{quote?.delivery.km != null && fulfilment === "delivery" ? ` (${quote.delivery.km.toFixed(1)} km)` : ""}</dt>
                <dd>{!quote ? "…" : quote.deliveryFee === 0 ? <span className="font-semibold text-emerald-700">FREE</span> : formatINR(quote.deliveryFee)}</dd></div>
              {quote && quote.delivery.distanceFee > 0 && <p className="text-xs text-slate-500">Includes {formatINR(quote.delivery.distanceFee)} for distance beyond {settings?.freeRadiusKm} km.</p>}
              <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold"><dt>To pay</dt><dd>{formatINR(quote?.total ?? 0)}</dd></div>
            </dl>

            {quote?.requiresPrescription && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> Your order has prescription medicines. A pharmacist verifies your prescription before dispatch.</p>
            )}
            {(problems.length > 0 || quoteError) && (
              <ul role="alert" className="mt-4 space-y-1 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
                {quoteError && <li>{quoteError}</li>}
                {problems.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            )}
            {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            <button type="button" onClick={place} disabled={!canPlace} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? "Placing order…" : payment === "online" ? "Continue to payment" : "Place order"}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">Prices and stock are checked again when you place the order.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
