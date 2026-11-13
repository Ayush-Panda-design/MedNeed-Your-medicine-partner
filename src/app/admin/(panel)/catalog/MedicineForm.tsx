"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AlertTriangle, ImagePlus, Loader2, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { FORMS, SCHEDULES, SCHEDULE_HELP, formatINRExact } from "@/lib/catalog";
import { DataBadge, StatusBadge } from "./badges";

export type MedicineFormData = {
  id: string;
  name: string; manufacturer: string; categoryId: string; form: string; packSize: string; mrp: number; price: number;
  schedule: string; noOnlineSale: boolean; salts: { name: string; strength: string }[];
  description: string; uses: string[]; howToUse: string; sideEffects: string[]; precautions: string[];
  imageUrl: string | null; nppaCeilingPrice: number | null;
  /** Read-only stock summary. Stock itself is managed under Inventory. */
  stockQty: number; sellableQty: number; discountPercent: number;
  status: "draft" | "catalog" | "active" | "discontinued"; dataStatus: "unverified" | "verified" | "sample";
  source: string; verifiedAt: string | null; slug: string;
};

type State = {
  name: string; manufacturer: string; categoryId: string; form: string; packSize: string; mrp: string; price: string;
  schedule: string; noOnlineSale: boolean; salts: { name: string; strength: string }[];
  description: string; uses: string; howToUse: string; sideEffects: string; precautions: string;
  imageUrl: string | null; nppaCeilingPrice: string;
};

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const initial = (m?: MedicineFormData): State => ({
  name: m?.name ?? "", manufacturer: m?.manufacturer ?? "", categoryId: m?.categoryId ?? "", form: m?.form ?? "Tablet", packSize: m?.packSize ?? "",
  mrp: m ? String(m.mrp) : "", price: m ? String(m.price) : "", schedule: m?.schedule ?? "", noOnlineSale: m?.noOnlineSale ?? false,
  salts: m?.salts ?? [], description: m?.description ?? "", uses: (m?.uses ?? []).join("\n"), howToUse: m?.howToUse ?? "",
  sideEffects: (m?.sideEffects ?? []).join("\n"), precautions: (m?.precautions ?? []).join("\n"), imageUrl: m?.imageUrl ?? null,
  nppaCeilingPrice: m?.nppaCeilingPrice != null ? String(m.nppaCeilingPrice) : "",
});

const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-600 disabled:bg-slate-100 disabled:text-slate-500";
const card = "rounded-2xl border border-slate-200 bg-white p-5";
const label = "mb-1 block text-sm font-medium";

// Survives the remount that follows router.refresh().
let carriedNotice = "";

export function MedicineForm({
  medicine, categories, manufacturers, privileged,
}: {
  medicine?: MedicineFormData;
  categories: { id: string; name: string }[];
  manufacturers: string[];
  privileged: boolean;
}) {
  const router = useRouter();
  const [s, setS] = useState<State>(() => initial(medicine));
  const startJson = useRef(JSON.stringify(initial(medicine)));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(() => { const n = carriedNotice; carriedNotice = ""; return n; });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isNew = !medicine;
  // Without pharmacist/admin rights, a live product's details are read-only except price and stock.
  const limited = !privileged && medicine?.status === "active";
  const dirty = JSON.stringify(s) !== startJson.current;
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((p) => ({ ...p, [k]: v }));
  const locked = (field: string) => limited && !["mrp", "price"].includes(field);
  const blockedOnline = s.schedule === "X" || s.noOnlineSale;
  const fromStock = (medicine?.sellableQty ?? 0) > 0;

  function payload(): Record<string, unknown> | string {
    const mrp = Number(s.mrp);
    const price = Number(s.price);
    if (!Number.isFinite(mrp) || mrp <= 0) return "Enter the MRP.";
    if (!Number.isFinite(price) || price <= 0) return "Enter the selling price.";
    if (!s.schedule) return "Choose the prescription schedule.";
    const ceiling = s.nppaCeilingPrice.trim() ? Number(s.nppaCeilingPrice) : null;
    if (ceiling !== null && (!Number.isFinite(ceiling) || ceiling <= 0)) return "NPPA ceiling price must be a number.";
    const full = {
      name: s.name, manufacturer: s.manufacturer, categoryId: s.categoryId, form: s.form, packSize: s.packSize, mrp, price, schedule: s.schedule,
      noOnlineSale: s.noOnlineSale, salts: s.salts.filter((x) => x.name.trim() || x.strength.trim()),
      description: s.description, uses: lines(s.uses), howToUse: s.howToUse, sideEffects: lines(s.sideEffects), precautions: lines(s.precautions),
      imageUrl: s.imageUrl, nppaCeilingPrice: ceiling,
    };
    return limited ? { mrp, price } : full;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    const body = payload();
    if (typeof body === "string") return setError(body);
    setBusy(true);
    const res = isNew
      ? await api<{ medicine: { id: string } }>("/api/admin/catalog/medicines", { body })
      : await api(`/api/admin/catalog/medicines/${medicine!.id}`, { method: "PATCH", body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    if (isNew) return router.push(`/admin/catalog/${(res.data as { medicine: { id: string } }).medicine.id}?created=1`);
    startJson.current = JSON.stringify(s);
    setNotice("Saved.");
    carriedNotice = "Saved."; // the form remounts with fresh server data; carry the message over
    router.refresh();
  }

  async function action(a: "verify" | "unverify" | "publish" | "unpublish" | "list" | "unlist" | "discontinue") {
    setError("");
    setNotice("");
    setBusy(true);
    const res = await api(`/api/admin/catalog/medicines/${medicine!.id}/action`, { body: { action: a } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const res = await api(`/api/admin/catalog/medicines/${medicine!.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push("/admin/catalog");
  }

  async function upload(file: File) {
    setError("");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/catalog/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Upload failed.");
      else set("imageUrl", data.url);
    } catch {
      setError("Network problem. Check your connection and try again.");
    }
    setUploading(false);
  }

  const m = medicine;
  return (
    <form onSubmit={save} className="space-y-6" noValidate>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {limited && (
        <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> This product is live. You can change its price and stock. Only a pharmacist or admin can change its details.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className={card}>
            <h2 className="mb-4 font-bold">Basics</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="f-name" className={label}>Name</label>
                <input id="f-name" className={input} value={s.name} onChange={(e) => set("name", e.target.value)} disabled={locked("name")} maxLength={160} placeholder="e.g. Amoxycillin 500mg Capsule" />
              </div>
              <div>
                <label htmlFor="f-mf" className={label}>Manufacturer</label>
                <input id="f-mf" list="mf-list" className={input} value={s.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} disabled={locked("manufacturer")} maxLength={120} />
                <datalist id="mf-list">{manufacturers.map((x) => <option key={x} value={x} />)}</datalist>
              </div>
              <div>
                <label htmlFor="f-cat" className={label}>Category</label>
                <select id="f-cat" className={input} value={s.categoryId} onChange={(e) => set("categoryId", e.target.value)} disabled={locked("categoryId")}>
                  <option value="">Choose a category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="f-form" className={label}>Form</label>
                <select id="f-form" className={input} value={s.form} onChange={(e) => set("form", e.target.value)} disabled={locked("form")}>
                  {FORMS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="f-pack" className={label}>Pack size</label>
                <input id="f-pack" className={input} value={s.packSize} onChange={(e) => set("packSize", e.target.value)} disabled={locked("packSize")} maxLength={80} placeholder="e.g. Strip of 10 capsules" />
              </div>
            </div>
          </section>

          <section className={card}>
            <h2 className="mb-1 font-bold">Prescription rules</h2>
            <p className="mb-4 text-sm text-slate-500">Choose carefully. This decides whether a prescription is required and whether the item can be sold online at all.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="f-sched" className={label}>Schedule</label>
                <select id="f-sched" className={input} value={s.schedule} onChange={(e) => set("schedule", e.target.value)} disabled={locked("schedule")}>
                  <option value="">Choose…</option>
                  {s.schedule === "unknown" && <option value="unknown" disabled>Not confirmed (choose one below)</option>}
                  {SCHEDULES.map((x) => <option key={x} value={x}>{x === "OTC" ? "OTC (no prescription)" : `Schedule ${x}`}</option>)}
                </select>
                {s.schedule && <p className="mt-1 text-xs text-slate-500">{SCHEDULE_HELP[s.schedule as keyof typeof SCHEDULE_HELP]}</p>}
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm">
                <input type="checkbox" checked={s.noOnlineSale} onChange={(e) => set("noOnlineSale", e.target.checked)} disabled={locked("noOnlineSale")} className="mt-1 accent-teal-600" />
                <span><span className="block font-medium">Never sold online</span><span className="text-xs text-slate-500">Narcotic, psychotropic, habit-forming or tranquilizer drugs.</span></span>
              </label>
            </div>
            {blockedOnline && (
              <p className="mt-4 flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> This item can be recorded in the catalog but can never be published to the store.</p>
            )}
          </section>

          <section className={card}>
            <h2 className="mb-4 font-bold">Price and stock</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="f-mrp" className={label}>MRP (₹, incl. tax)</label>
                <input id="f-mrp" inputMode="decimal" className={input} value={s.mrp} onChange={(e) => set("mrp", e.target.value)} disabled={fromStock} />
              </div>
              <div>
                <label htmlFor="f-price" className={label}>Selling price (₹)</label>
                <input id="f-price" inputMode="decimal" className={input} value={s.price} onChange={(e) => set("price", e.target.value)} disabled={fromStock} />
                <p className="mt-1 text-xs text-slate-500">{fromStock ? `MRP ${formatINRExact(medicine!.mrp)} less ${medicine!.discountPercent}% discount.` : "Cannot be higher than MRP."}</p>
              </div>
              <div>
                <label htmlFor="f-ceil" className={label}>NPPA ceiling price (₹)</label>
                <input id="f-ceil" inputMode="decimal" className={input} value={s.nppaCeilingPrice} onChange={(e) => set("nppaCeilingPrice", e.target.value)} disabled={locked("nppaCeilingPrice")} placeholder="Optional" />
              </div>
            </div>
            {medicine ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                <p>
                  <span className={`font-semibold ${medicine.sellableQty > 0 ? "text-emerald-700" : "text-rose-700"}`}>{medicine.sellableQty > 0 ? `${medicine.sellableQty} in stock` : "Out of stock"}</span>
                  {medicine.stockQty !== medicine.sellableQty && <span className="text-slate-500"> · {medicine.stockQty} on hand (some near expiry)</span>}
                  {fromStock && <span className="block text-xs text-slate-500">MRP and price come from the stock batch. Change the discount on the stock page.</span>}
                </p>
                <Link href={`/admin/inventory/${medicine.id}`} className="font-semibold text-teal-700 hover:underline">Manage stock →</Link>
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Stock is added from a purchase bill under Inventory. The MRP and price here are used until stock is received.</p>
            )}
          </section>

          <section className={card}>
            <h2 className="mb-1 font-bold">Composition</h2>
            <p className="mb-4 text-sm text-slate-500">One row per salt (active ingredient). Substitutes are matched on identical salts and strengths, so use consistent spelling. Leave empty for devices.</p>
            <div className="space-y-2">
              {s.salts.map((x, i) => (
                <div key={i} className="flex gap-2">
                  <input aria-label={`Salt ${i + 1} name`} className={input} value={x.name} onChange={(e) => set("salts", s.salts.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} disabled={locked("salts")} placeholder="Salt name, e.g. Paracetamol" maxLength={120} />
                  <input aria-label={`Salt ${i + 1} strength`} className={`${input} max-w-40`} value={x.strength} onChange={(e) => set("salts", s.salts.map((y, j) => (j === i ? { ...y, strength: e.target.value } : y)))} disabled={locked("salts")} placeholder="e.g. 500mg" maxLength={40} />
                  {!locked("salts") && <button type="button" aria-label={`Remove salt ${i + 1}`} onClick={() => set("salts", s.salts.filter((_, j) => j !== i))} className="grid w-10 shrink-0 place-items-center rounded-xl border border-slate-300 text-slate-500 hover:bg-slate-50"><X className="h-4 w-4" /></button>}
                </div>
              ))}
            </div>
            {!locked("salts") && s.salts.length < 12 && (
              <button type="button" onClick={() => set("salts", [...s.salts, { name: "", strength: "" }])} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline"><Plus className="h-4 w-4" /> Add salt</button>
            )}
          </section>

          <section className={card}>
            <h2 className="mb-4 font-bold">Patient information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="f-desc" className={label}>About this product</label>
                <textarea id="f-desc" rows={3} className={input} value={s.description} onChange={(e) => set("description", e.target.value)} disabled={locked("description")} maxLength={4000} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="f-uses" className={label}>Uses <span className="font-normal text-slate-500">(one per line)</span></label>
                  <textarea id="f-uses" rows={4} className={input} value={s.uses} onChange={(e) => set("uses", e.target.value)} disabled={locked("uses")} />
                </div>
                <div>
                  <label htmlFor="f-how" className={label}>How to use</label>
                  <textarea id="f-how" rows={4} className={input} value={s.howToUse} onChange={(e) => set("howToUse", e.target.value)} disabled={locked("howToUse")} maxLength={2000} />
                </div>
                <div>
                  <label htmlFor="f-se" className={label}>Side effects <span className="font-normal text-slate-500">(one per line)</span></label>
                  <textarea id="f-se" rows={4} className={input} value={s.sideEffects} onChange={(e) => set("sideEffects", e.target.value)} disabled={locked("sideEffects")} />
                </div>
                <div>
                  <label htmlFor="f-pre" className={label}>Safety advice <span className="font-normal text-slate-500">(one per line)</span></label>
                  <textarea id="f-pre" rows={4} className={input} value={s.precautions} onChange={(e) => set("precautions", e.target.value)} disabled={locked("precautions")} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          {m && (
            <section className={card}>
              <h2 className="mb-3 font-bold">Status</h2>
              <div className="flex flex-wrap gap-2"><StatusBadge value={m.status} /><DataBadge value={m.dataStatus} /></div>
              <p className="mt-3 text-xs text-slate-500">
                {m.dataStatus === "verified" ? `Verified${m.verifiedAt ? ` on ${new Date(m.verifiedAt).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}` : ""}.` : m.dataStatus === "sample" ? "Fictional sample data for development." : "Not yet reviewed. Check the details, then mark verified."}
                {" "}Source: {m.source}.
              </p>
              {(m.status === "active" || m.status === "catalog") && <Link href={`/medicines/${m.slug}`} target="_blank" className="mt-2 inline-block text-sm font-semibold text-teal-700 hover:underline">View on store</Link>}

              {privileged && (
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  {dirty && <p className="text-xs text-amber-700">Save your changes before verifying or publishing.</p>}
                  {m.dataStatus === "unverified" && <button type="button" disabled={busy || dirty} onClick={() => action("verify")} className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50">Mark verified</button>}
                  {m.dataStatus === "verified" && m.status !== "active" && <button type="button" disabled={busy || dirty} onClick={() => action("unverify")} className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50">Mark unverified</button>}
                  {m.status !== "active" && <button type="button" disabled={busy || dirty || m.dataStatus === "unverified" || blockedOnline} onClick={() => action("publish")} className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">Publish to store</button>}
                  {m.status === "active" && <button type="button" disabled={busy} onClick={() => action("unpublish")} className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50">Unpublish</button>}
                  {m.status === "draft" && <button type="button" disabled={busy || dirty} onClick={() => action("list")} className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50">Show in catalog (request only)</button>}
                  {m.status === "catalog" && <button type="button" disabled={busy} onClick={() => action("unlist")} className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50">Remove from catalog</button>}
                  {m.status !== "discontinued" && <button type="button" disabled={busy} onClick={() => action("discontinue")} className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Mark discontinued</button>}
                  {m.status === "draft" && !confirmDelete && <button type="button" onClick={() => setConfirmDelete(true)} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"><Trash2 className="h-4 w-4" /> Delete draft</button>}
                  {confirmDelete && (
                    <div className="rounded-xl bg-rose-50 p-3 text-sm">
                      <p className="font-semibold text-rose-800">Delete this draft permanently?</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" disabled={busy} onClick={remove} className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white">Delete</button>
                        <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-white">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">Changing the name, manufacturer, form, pack size, schedule or composition sends a verified or live product back to review.</p>
            </section>
          )}

          <section className={card}>
            <h2 className="mb-3 font-bold">Product image</h2>
            {s.imageUrl ? (
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imageUrl} alt="Product" className="aspect-square w-full rounded-xl border border-slate-200 bg-white object-contain p-2" />
                {!locked("imageUrl") && <button type="button" onClick={() => set("imageUrl", null)} className="mt-2 text-sm font-semibold text-rose-700 hover:underline">Remove image</button>}
              </div>
            ) : (
              <div className="grid aspect-square w-full place-items-center rounded-xl border-2 border-dashed border-slate-300 text-center text-sm text-slate-500">
                <span>No image yet.<br />A placeholder is shown on the store.</span>
              </div>
            )}
            {!locked("imageUrl") && (
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {s.imageUrl ? "Replace image" : "Upload image"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
              </label>
            )}
            <p className="mt-2 text-xs text-slate-500">JPEG, PNG or WebP, up to 2 MB. Use only photos you own or are licensed to use. {s.imageUrl !== (m?.imageUrl ?? null) && "Save to apply."}</p>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-0 -mx-6 flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-100/95 px-6 py-3 backdrop-blur">
        <p className="text-sm text-slate-500">{m ? `Price now ${formatINRExact(m.price)} (MRP ${formatINRExact(m.mrp)})` : "New medicines start as unverified drafts."}</p>
        <div className="flex gap-2">
          <Link href="/admin/catalog" className="rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-white">Back</Link>
          <button disabled={busy || (!isNew && !dirty)} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {isNew ? "Create draft" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
