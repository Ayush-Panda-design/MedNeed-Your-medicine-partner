import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { listCategoriesAdmin } from "@/server/catalog/repo";
import { CATEGORY_ICONS } from "@/server/catalog/schema";
import { CategoriesManager } from "./CategoriesManager";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireStaff("/admin/catalog/categories", ["admin"]);
  const categories = await listCategoriesAdmin();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/catalog" className="text-sm text-teal-700 hover:underline">← Catalog</Link>
        <h1 className="mt-1 text-2xl font-bold">Categories</h1>
        <p className="mt-1 text-sm text-slate-500">Categories appear in the store menu and filters. A hidden category and its medicines stay out of the menu but remain reachable by direct link.</p>
      </div>
      <CategoriesManager categories={categories} icons={[...CATEGORY_ICONS]} />
    </div>
  );
}
