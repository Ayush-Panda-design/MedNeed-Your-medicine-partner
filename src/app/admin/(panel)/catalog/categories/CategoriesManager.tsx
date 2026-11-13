"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

type Cat = { id: string; slug: string; name: string; icon: string; blurb: string; sortOrder: number; isActive: boolean; medicineCount: number };
const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600";

function Row({ cat, icons, onSaved }: { cat?: Cat; icons: string[]; onSaved: () => void }) {
  const [v, setV] = useState({ name: cat?.name ?? "", blurb: cat?.blurb ?? "", icon: cat?.icon ?? "pill", sortOrder: String(cat?.sortOrder ?? 0), isActive: cat?.isActive ?? true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changed = !cat || v.name !== cat.name || v.blurb !== cat.blurb || v.icon !== cat.icon || Number(v.sortOrder) !== cat.sortOrder || v.isActive !== cat.isActive;

  async function save() {
    setBusy(true);
    setError("");
    const body = { name: v.name, blurb: v.blurb, icon: v.icon, sortOrder: Number(v.sortOrder) || 0, isActive: v.isActive };
    const res = cat ? await api(`/api/admin/catalog/categories/${cat.id}`, { method: "PATCH", body }) : await api("/api/admin/catalog/categories", { body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    if (!cat) setV({ name: "", blurb: "", icon: "pill", sortOrder: "0", isActive: true });
    onSaved();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-[1.2fr_1.6fr_140px_90px_auto_auto] md:items-center">
        <input aria-label="Name" className={input} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Category name" maxLength={60} />
        <input aria-label="Description" className={input} value={v.blurb} onChange={(e) => setV({ ...v, blurb: e.target.value })} placeholder="Short description" maxLength={120} />
        <select aria-label="Icon" className={input} value={v.icon} onChange={(e) => setV({ ...v, icon: e.target.value })}>{icons.map((i) => <option key={i}>{i}</option>)}</select>
        <input aria-label="Order" inputMode="numeric" className={input} value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: e.target.value })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.isActive} onChange={(e) => setV({ ...v, isActive: e.target.checked })} className="accent-teal-600" /> Visible</label>
        <button onClick={save} disabled={busy || !changed || v.name.trim().length < 2} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {cat ? "Save" : "Add"}
        </button>
      </div>
      {cat && <p className="mt-2 text-xs text-slate-500">/medicines?category={cat.slug} · {cat.medicineCount} medicine{cat.medicineCount === 1 ? "" : "s"}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
    </div>
  );
}

export function CategoriesManager({ categories, icons }: { categories: Cat[]; icons: string[] }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  return (
    <div className="space-y-3">
      <div className="hidden px-4 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[1.2fr_1.6fr_140px_90px_auto_auto] md:gap-3"><span>Name</span><span>Description</span><span>Icon</span><span>Order</span><span /><span /></div>
      {categories.map((c) => <Row key={`${c.id}-${c.name}-${c.sortOrder}-${c.isActive}-${c.icon}-${c.blurb}`} cat={c} icons={icons} onSaved={refresh} />)}
      <h2 className="pt-4 font-bold">Add a category</h2>
      <Row icons={icons} onSaved={refresh} />
    </div>
  );
}
