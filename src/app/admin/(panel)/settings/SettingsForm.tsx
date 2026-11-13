"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Crosshair } from "lucide-react";
import { api } from "@/lib/api";
import type { StoreSettings } from "@/server/orders/settings";

const f = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600";
const card = "rounded-2xl border border-slate-200 bg-white p-5";
const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

export function SettingsForm({ initial, locationConfigured }: { initial: StoreSettings; locationConfigured: boolean }) {
  const router = useRouter();
  const [s, setS] = useState<StoreSettings>(initial);
  const [slots, setSlots] = useState(initial.slots.join("\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const up = <K extends keyof StoreSettings>(k: K, patch: Partial<StoreSettings[K]>) => setS((p) => ({ ...p, [k]: { ...(p[k] as object), ...patch } }));

  function locate() {
    setError("");
    if (!navigator.geolocation) return setError("This browser cannot share its location. Type the latitude and longitude instead.");
    navigator.geolocation.getCurrentPosition(
      (p) => up("shop", { lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) }),
      () => setError("Could not get the location. Allow location access, or type the latitude and longitude."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const body = { ...s, slots: slots.split("\n").map((x) => x.trim()).filter(Boolean) };
    const res = await api("/api/admin/orders/settings", { method: "PUT", body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setNotice("Settings saved.");
    router.refresh();
  }

  return (
    <form onSubmit={save} noValidate className="space-y-5" aria-label="Shop settings">
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <section className={card}>
        <h2 className="font-bold">Shop</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="sh-name" className="mb-1 block text-sm font-medium">Shop name</label><input id="sh-name" className={f} value={s.shop.name} onChange={(e) => up("shop", { name: e.target.value })} /></div>
          <div><label htmlFor="sh-phone" className="mb-1 block text-sm font-medium">Phone</label><input id="sh-phone" className={f} value={s.shop.phone} onChange={(e) => up("shop", { phone: e.target.value })} /></div>
          <div className="sm:col-span-2"><label htmlFor="sh-addr" className="mb-1 block text-sm font-medium">Address (shown for store pickup)</label><input id="sh-addr" className={f} value={s.shop.address} onChange={(e) => up("shop", { address: e.target.value })} /></div>
          <div><label htmlFor="sh-lat" className="mb-1 block text-sm font-medium">Latitude</label><input id="sh-lat" inputMode="decimal" className={f} value={s.shop.lat} onChange={(e) => up("shop", { lat: num(e.target.value) })} /></div>
          <div><label htmlFor="sh-lng" className="mb-1 block text-sm font-medium">Longitude</label><input id="sh-lng" inputMode="decimal" className={f} value={s.shop.lng} onChange={(e) => up("shop", { lng: num(e.target.value) })} /></div>
        </div>
        <button type="button" onClick={locate} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"><Crosshair className="h-4 w-4" /> Use my current location</button>
        <p className="mt-2 text-xs text-slate-500">Open this page at the shop and press the button, or copy the coordinates from Google Maps (right-click the shop, click the numbers).{locationConfigured ? "" : " Not set yet."}</p>
      </section>

      <section className={card}>
        <h2 className="font-bold">Delivery</h2>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-600" checked={s.delivery.enabled} onChange={(e) => up("delivery", { enabled: e.target.checked })} /> Home delivery is on</label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="d-min" className="mb-1 block text-sm font-medium">Minimum order for delivery (₹)</label><input id="d-min" inputMode="decimal" className={f} value={s.delivery.minOrder} onChange={(e) => up("delivery", { minOrder: num(e.target.value) })} /></div>
          <div><label htmlFor="d-free" className="mb-1 block text-sm font-medium">Normal delivery area (km)</label><input id="d-free" inputMode="decimal" className={f} value={s.delivery.freeRadiusKm} onChange={(e) => up("delivery", { freeRadiusKm: num(e.target.value) })} /></div>
          <div><label htmlFor="d-rate" className="mb-1 block text-sm font-medium">Extra charge per km beyond that (₹)</label><input id="d-rate" inputMode="decimal" className={f} value={s.delivery.perKmRate} onChange={(e) => up("delivery", { perKmRate: num(e.target.value) })} /></div>
          <div><label htmlFor="d-max" className="mb-1 block text-sm font-medium">Farthest we deliver (km)</label><input id="d-max" inputMode="decimal" className={f} value={s.delivery.maxRadiusKm} onChange={(e) => up("delivery", { maxRadiusKm: num(e.target.value) })} /></div>
        </div>
        <h3 className="mt-5 text-sm font-semibold">Delivery fee by bill size</h3>
        <p className="text-xs text-slate-500">Bands are checked from the smallest. Bills at or above the last amount get free delivery.</p>
        <div className="mt-2 space-y-2">
          {s.delivery.feeBands.map((b, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
              Bill below ₹<input aria-label={`Band ${i + 1} amount`} inputMode="decimal" className={`${f} w-28`} value={b.below} onChange={(e) => setS((p) => ({ ...p, delivery: { ...p.delivery, feeBands: p.delivery.feeBands.map((x, j) => (j === i ? { ...x, below: num(e.target.value) } : x)) } }))} />
              pays ₹<input aria-label={`Band ${i + 1} fee`} inputMode="decimal" className={`${f} w-24`} value={b.fee} onChange={(e) => setS((p) => ({ ...p, delivery: { ...p.delivery, feeBands: p.delivery.feeBands.map((x, j) => (j === i ? { ...x, fee: num(e.target.value) } : x)) } }))} />
              <button type="button" onClick={() => setS((p) => ({ ...p, delivery: { ...p.delivery, feeBands: p.delivery.feeBands.filter((_, j) => j !== i) } }))} className="text-rose-600 hover:underline">Remove</button>
            </div>
          ))}
          {s.delivery.feeBands.length < 5 && <button type="button" onClick={() => setS((p) => ({ ...p, delivery: { ...p.delivery, feeBands: [...p.delivery.feeBands, { below: 1000, fee: 0 }] } }))} className="text-sm font-medium text-teal-700 hover:underline">Add a band</button>}
        </div>
      </section>

      <section className={card}>
        <h2 className="font-bold">Pickup and payment</h2>
        <div className="mt-3 space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-teal-600" checked={s.pickup.enabled} onChange={(e) => up("pickup", { enabled: e.target.checked })} /> Store pickup is on</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-teal-600" checked={s.payments.codEnabled} onChange={(e) => up("payments", { codEnabled: e.target.checked })} /> Pay on delivery (cash or UPI) is on</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-teal-600" checked={s.payments.onlineEnabled} onChange={(e) => up("payments", { onlineEnabled: e.target.checked })} /> Online payment is on <span className="text-xs text-amber-700">(also needs the Razorpay keys on the server; without them customers never see it)</span></label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="p-cod" className="mb-1 block text-sm font-medium">Largest order payable on delivery (₹)</label><input id="p-cod" inputMode="decimal" className={f} value={s.payments.codMax} onChange={(e) => up("payments", { codMax: num(e.target.value) })} /></div>
          <div><label htmlFor="p-hold" className="mb-1 block text-sm font-medium">Hold stock for online payment (minutes)</label><input id="p-hold" inputMode="numeric" className={f} value={s.holdMinutes} onChange={(e) => setS((p) => ({ ...p, holdMinutes: num(e.target.value) }))} /></div>
          <div><label htmlFor="p-max" className="mb-1 block text-sm font-medium">Most units of one medicine per order</label><input id="p-max" inputMode="numeric" className={f} value={s.maxQtyPerLine} onChange={(e) => setS((p) => ({ ...p, maxQtyPerLine: num(e.target.value) }))} /></div>
          <div><label htmlFor="p-rxdays" className="mb-1 block text-sm font-medium">Prescription valid for (days)</label><input id="p-rxdays" inputMode="numeric" className={f} value={s.prescriptions.validityDays} onChange={(e) => setS((p) => ({ ...p, prescriptions: { validityDays: num(e.target.value) } }))} /></div>
        </div>
      </section>

      <section className={card}>
        <h2 className="font-bold">Messages to customers</h2>
        <p className="mt-1 text-sm text-slate-500">Order updates are sent on every channel that is switched on here <em>and</em> set up on the server. See the message log under Customer messages.</p>
        <div className="mt-3 space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-teal-600" checked={s.notifications.email} onChange={(e) => up("notifications", { email: e.target.checked })} /> Email (all updates)</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-teal-600" checked={s.notifications.sms} onChange={(e) => up("notifications", { sms: e.target.checked })} /> SMS (important updates; India needs DLT-approved templates)</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-teal-600" checked={s.notifications.whatsapp} onChange={(e) => up("notifications", { whatsapp: e.target.checked })} /> WhatsApp (important updates; needs Meta-approved templates)</label>
        </div>
      </section>

      <section className={card}>
        <h2 className="font-bold">Hours and time slots</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div><label htmlFor="h-open" className="mb-1 block text-sm font-medium">Opens</label><input id="h-open" className={f} value={s.hours.open} onChange={(e) => up("hours", { open: e.target.value })} placeholder="09:00" /></div>
          <div><label htmlFor="h-close" className="mb-1 block text-sm font-medium">Closes</label><input id="h-close" className={f} value={s.hours.close} onChange={(e) => up("hours", { close: e.target.value })} placeholder="21:00" /></div>
          <div className="sm:col-span-3"><label htmlFor="slots" className="mb-1 block text-sm font-medium">Time slots customers can choose (one per line, like 09:00-12:00)</label><textarea id="slots" rows={5} className={f} value={slots} onChange={(e) => setSlots(e.target.value)} /></div>
        </div>
      </section>

      <section className={card}>
        <h2 className="font-bold">Invoices and GST</h2>
        <p className="mt-1 text-sm text-slate-500">Printed on every invoice. Prices already include GST, so the tax is worked out from the price. Ask your accountant to confirm the rates.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="iv-name" className="mb-1 block text-sm font-medium">Legal name on invoice</label><input id="iv-name" className={f} value={s.invoice.legalName} onChange={(e) => up("invoice", { legalName: e.target.value })} /></div>
          <div><label htmlFor="iv-gstin" className="mb-1 block text-sm font-medium">GSTIN</label><input id="iv-gstin" className={`${f} uppercase`} maxLength={15} value={s.invoice.gstin} onChange={(e) => up("invoice", { gstin: e.target.value.toUpperCase() })} /></div>
          <div className="sm:col-span-2"><label htmlFor="iv-dl" className="mb-1 block text-sm font-medium">Drug licence number(s)</label><input id="iv-dl" className={f} value={s.invoice.drugLicense} onChange={(e) => up("invoice", { drugLicense: e.target.value })} /></div>
          <div><label htmlFor="iv-state" className="mb-1 block text-sm font-medium">Shop state</label><input id="iv-state" className={f} value={s.invoice.state} onChange={(e) => up("invoice", { state: e.target.value })} /></div>
          <div><label htmlFor="iv-gst" className="mb-1 block text-sm font-medium">Default GST on medicines (%)</label><input id="iv-gst" inputMode="decimal" className={f} value={s.invoice.defaultGstPercent} onChange={(e) => up("invoice", { defaultGstPercent: num(e.target.value) })} /></div>
          <div><label htmlFor="iv-dgst" className="mb-1 block text-sm font-medium">GST on delivery charge (%)</label><input id="iv-dgst" inputMode="decimal" className={f} value={s.invoice.deliveryGstPercent} onChange={(e) => up("invoice", { deliveryGstPercent: num(e.target.value) })} /></div>
          <div className="sm:col-span-2"><label htmlFor="iv-note" className="mb-1 block text-sm font-medium">Note at the bottom of the invoice</label><textarea id="iv-note" rows={2} className={f} value={s.invoice.footerNote} onChange={(e) => up("invoice", { footerNote: e.target.value })} /></div>
        </div>
        <p className="mt-2 text-xs text-slate-500">A medicine with its own rate (set on its Inventory page) uses that instead of the default.</p>
      </section>

      <button disabled={busy} className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{busy ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
