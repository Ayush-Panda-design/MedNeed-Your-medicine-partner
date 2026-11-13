import type { Metadata } from "next";
import Link from "next/link";
import { FileUp, Inbox, Plus, Tags } from "lucide-react";
import { requireStaff } from "@/server/auth/session";
import { listAdminMedicines, listCategoriesAdmin } from "@/server/catalog/repo";
import { CatalogTable, type AdminRow } from "./CatalogTable";
import { AutoCategorise } from "./AutoCategorise";
import { query } from "@/server/db";

export const metadata: Metadata = { title: "Catalog" };
const PAGE_SIZE = 25;

type SP = { q?: string; status?: string; data?: string; category?: string; page?: string };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { user } = await requireStaff("/admin/catalog");
  const sp = await searchParams;
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const [{ items, total }, categories] = await Promise.all([
    listAdminMedicines({ q: sp.q, status: sp.status, dataStatus: sp.data, category: sp.category, page, pageSize: PAGE_SIZE }),
    listCategoriesAdmin(),
  ]);
  const [{ n: uncatCount }] = await query<{ n: string }>(`select count(*)::text n from medicines m join categories c on c.id = m.category_id where c.slug = 'uncategorised' and m.status in ('draft','catalog')`);
  const privileged = user.roles.includes("admin") || user.roles.includes("pharmacist");
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows: AdminRow[] = items.map((m) => ({
    id: m.id, name: m.name, composition: m.composition, manufacturer: m.manufacturer, categoryName: m.categoryName, schedule: m.schedule,
    mrp: m.mrp, price: m.price, status: m.status, dataStatus: m.dataStatus, inStock: m.inStock, noOnlineSale: m.noOnlineSale,
  }));

  const href = (n: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") p.set(k, v);
    if (n > 1) p.set("page", String(n));
    const qs = p.toString();
    return qs ? `/admin/catalog?${qs}` : "/admin/catalog";
  };
  const filtered = Boolean(sp.q || sp.status || sp.data || sp.category);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Catalog</h1>
          <p className="mt-1 text-sm text-slate-500">
            Medicines appear on the store only when they are <strong>verified</strong> and <strong>published</strong>. Schedule X and never-online items cannot be published.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.roles.includes("admin") && (
            <Link href="/admin/catalog/categories" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><Tags className="h-4 w-4" /> Categories</Link>
          )}
          <Link href="/admin/catalog/requests" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><Inbox className="h-4 w-4" /> Requests</Link>
          <Link href="/admin/catalog/import" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><FileUp className="h-4 w-4" /> Import CSV</Link>
          <Link href="/admin/catalog/new" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"><Plus className="h-4 w-4" /> Add medicine</Link>
        </div>
      </div>

      <form action="/admin/catalog" className="flex flex-wrap gap-3">
        <input name="q" defaultValue={sp.q} placeholder="Search name, salt or manufacturer" aria-label="Search catalog" className="min-w-64 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-teal-600" />
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Filter by status" className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
          <option value="">Any status</option><option value="active">Live</option><option value="catalog">Catalog only</option><option value="draft">Draft</option><option value="discontinued">Discontinued</option>
        </select>
        <select name="data" defaultValue={sp.data ?? ""} aria-label="Filter by verification" className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
          <option value="">Any verification</option><option value="unverified">Needs review</option><option value="verified">Verified</option><option value="sample">Sample data</option>
        </select>
        <select name="category" defaultValue={sp.category ?? ""} aria-label="Filter by category" className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <button className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Search</button>
        {filtered && <Link href="/admin/catalog" className="self-center text-sm text-teal-700 hover:underline">Clear</Link>}
      </form>

      <p className="text-sm text-slate-500">{total.toLocaleString("en-IN")} {total === 1 ? "medicine" : "medicines"}</p>
      {privileged && Number(uncatCount) > 0 && <AutoCategorise uncategorised={Number(uncatCount)} />}
      <CatalogTable rows={rows} canBulk={privileged} />

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link href={href(page - 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 hover:border-teal-500">Previous</Link>}
          <span className="px-2 text-slate-500">Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={href(page + 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 hover:border-teal-500">Next</Link>}
        </nav>
      )}
    </div>
  );
}
