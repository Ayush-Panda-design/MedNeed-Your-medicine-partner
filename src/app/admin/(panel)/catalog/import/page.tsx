import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { ImportTool } from "./ImportTool";
import { StoreItemsPanel } from "./StoreItemsPanel";
import { storeItemCount } from "@/server/catalog/store-items";

export const metadata: Metadata = { title: "Import medicines" };

export default async function ImportPage() {
  const { user } = await requireStaff("/admin/catalog/import");
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/catalog" className="text-sm text-teal-700 hover:underline">← Catalog</Link>
        <h1 className="mt-1 text-2xl font-bold">Import medicines from CSV</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Imported medicines always arrive as <strong>unverified drafts</strong>, so nothing goes on the store until a pharmacist or admin has reviewed it.
          Only import data you have the right to use, such as a licensed dataset or your own records.
        </p>
      </div>
      {user.roles.includes("admin") && <StoreItemsPanel items={storeItemCount} />}
      <ImportTool />
    </div>
  );
}
