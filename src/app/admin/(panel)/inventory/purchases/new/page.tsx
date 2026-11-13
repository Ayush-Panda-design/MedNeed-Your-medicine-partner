import type { Metadata } from "next";
import Link from "next/link";
import { query } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { TODAY_SQL } from "@/server/inventory/config";
import { listSuppliers } from "@/server/inventory/suppliers";
import { PurchaseForm } from "./PurchaseForm";

export const metadata: Metadata = { title: "Receive stock" };

export default async function NewPurchasePage() {
  await requireStaff("/admin/inventory/purchases/new", ["admin", "inventory_manager"]);
  const [suppliers, [{ today }]] = await Promise.all([listSuppliers({ activeOnly: true }), query<{ today: string }>(`select to_char(${TODAY_SQL}, 'YYYY-MM-DD') as today`)]);
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory" className="text-sm text-teal-700 hover:underline">← Inventory</Link>
        <h1 className="mt-1 text-2xl font-bold">Receive stock</h1>
        <p className="mt-1 text-sm text-slate-500">Copy the details from the wholesaler&apos;s bill. Saving adds the stock and the medicines become available to order once they are published.</p>
      </div>
      {suppliers.length === 0 ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Add a supplier first. <Link href="/admin/inventory/suppliers" className="font-semibold underline">Go to suppliers</Link></p>
      ) : (
        <PurchaseForm suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))} today={today} />
      )}
    </div>
  );
}
