import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { listSuppliers } from "@/server/inventory/suppliers";
import { SupplierManager } from "./SupplierManager";

export const metadata: Metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  await requireStaff("/admin/inventory/suppliers", ["admin", "inventory_manager"]);
  const suppliers = await listSuppliers();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory" className="text-sm text-teal-700 hover:underline">← Inventory</Link>
        <h1 className="mt-1 text-2xl font-bold">Suppliers</h1>
        <p className="mt-1 text-sm text-slate-500">The wholesalers you buy from. Choose one when you enter a purchase bill.</p>
      </div>
      <SupplierManager suppliers={suppliers} />
    </div>
  );
}
