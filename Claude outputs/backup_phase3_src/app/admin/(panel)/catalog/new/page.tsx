import type { Metadata } from "next";
import Link from "next/link";
import { query } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { listCategoriesAdmin } from "@/server/catalog/repo";
import { MedicineForm } from "../MedicineForm";

export const metadata: Metadata = { title: "Add medicine" };

export default async function NewMedicinePage() {
  const { user } = await requireStaff("/admin/catalog/new");
  const [categories, mfs] = await Promise.all([listCategoriesAdmin(), query<{ name: string }>(`select name from manufacturers order by name limit 2000`)]);
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/catalog" className="text-sm text-teal-700 hover:underline">← Catalog</Link>
        <h1 className="mt-1 text-2xl font-bold">Add medicine</h1>
        <p className="mt-1 text-sm text-slate-500">It is saved as an unverified draft. A pharmacist or admin must verify it before it can go on the store.</p>
      </div>
      <MedicineForm
        categories={categories.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name }))}
        manufacturers={mfs.map((m) => m.name)}
        privileged={user.roles.includes("admin") || user.roles.includes("pharmacist")}
      />
    </div>
  );
}
