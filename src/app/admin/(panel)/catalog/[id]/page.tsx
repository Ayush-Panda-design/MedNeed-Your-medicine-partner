import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { query } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { getAdminMedicine, listCategoriesAdmin } from "@/server/catalog/repo";
import { MedicineForm } from "../MedicineForm";

export const metadata: Metadata = { title: "Edit medicine" };

export default async function EditMedicinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireStaff(`/admin/catalog/${id}`);
  const m = await getAdminMedicine(id);
  if (!m) notFound();
  const [categories, mfs] = await Promise.all([listCategoriesAdmin(), query<{ name: string }>(`select name from manufacturers order by name limit 2000`)]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/catalog" className="text-sm text-teal-700 hover:underline">← Catalog</Link>
        <h1 className="mt-1 text-2xl font-bold">{m.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{m.manufacturer}</p>
      </div>
      {/* The key remounts the form with fresh server data after every save or workflow action. */}
      <MedicineForm
        key={`${m.updatedAt}|${m.status}|${m.dataStatus}`}
        medicine={{
          id: m.id, slug: m.slug, name: m.name, manufacturer: m.manufacturer, categoryId: m.categoryId, form: m.form, packSize: m.packSize, mrp: m.mrp, price: m.price,
          schedule: m.schedule, noOnlineSale: m.noOnlineSale, stockQty: m.stockQty, sellableQty: m.availableQty, discountPercent: m.discountPercent, salts: m.salts, description: m.description, uses: m.uses, howToUse: m.howToUse,
          sideEffects: m.sideEffects, precautions: m.precautions, imageUrl: m.imageUrl, nppaCeilingPrice: m.nppaCeilingPrice, status: m.status,
          dataStatus: m.dataStatus, source: m.source, verifiedAt: m.verifiedAt,
        }}
        categories={categories.filter((c) => c.isActive || c.id === m.categoryId).map((c) => ({ id: c.id, name: c.name }))}
        manufacturers={mfs.map((x) => x.name)}
        privileged={user.roles.includes("admin") || user.roles.includes("pharmacist")}
      />
    </div>
  );
}
