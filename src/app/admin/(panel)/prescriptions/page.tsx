import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { adminListPrescriptions } from "@/server/prescriptions/service";
import { RX_LABEL, RX_STYLE } from "@/lib/prescriptionStatus";
import { dateTime } from "@/lib/orderStatus";

export const metadata: Metadata = { title: "Prescriptions" };
export const dynamic = "force-dynamic";

const TABS = [["open", "To review"], ["approved", "Approved"], ["rejected", "Rejected"], ["all", "All"]] as const;
const PAGE = 25;

function waiting(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.floor(mins / 60)} h` : `${Math.floor(mins / 1440)} d`;
}

export default async function AdminPrescriptions({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await requireStaff("/admin/prescriptions", ["admin", "pharmacist"]);
  const sp = await searchParams;
  const status = sp.status ?? "open";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total, counts } = await adminListPrescriptions({ status, q: sp.q, page, pageSize: PAGE });
  const open = (counts.pending ?? 0) + (counts.needs_info ?? 0);
  const href = (p: Record<string, string>) => `/admin/prescriptions?${new URLSearchParams({ status, ...(sp.q ? { q: sp.q } : {}), ...p }).toString()}`;

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Prescriptions</h1><p className="mt-1 text-sm text-slate-500">{counts.pending ?? 0} waiting for review{counts.needs_info ? `, ${counts.needs_info} waiting for the customer` : ""}. Oldest first.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map(([v, label]) => (
          <Link key={v} href={`/admin/prescriptions?status=${v}`} aria-current={status === v ? "page" : undefined} className={`rounded-full px-4 py-1.5 text-sm font-medium ${status === v ? "bg-teal-600 text-white" : "bg-white ring-1 ring-slate-200 hover:bg-slate-50"}`}>
            {label}{v === "open" ? ` (${open})` : v !== "all" && counts[v] ? ` (${counts[v]})` : ""}
          </Link>
        ))}
        <form className="ml-auto" role="search"><input type="hidden" name="status" value={status} /><input name="q" defaultValue={sp.q ?? ""} placeholder="Customer, patient, doctor or phone" aria-label="Search prescriptions" className="w-64 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600" /></form>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Patient / doctor</th><th className="px-4 py-3">Files</th><th className="px-4 py-3">Open orders</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Uploaded</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Nothing here.</td></tr>}
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><Link href={`/admin/prescriptions/${p.id}`} className="font-semibold text-teal-700 hover:underline">{p.customerName ?? "Customer"}</Link><span className="block text-xs text-slate-500">{p.customerPhone ? `+91 ${p.customerPhone.slice(-10)}` : p.customerEmail}</span></td>
                <td className="px-4 py-3">{p.patientName || "—"}<span className="block text-xs text-slate-500">{p.doctorName ? `Dr ${p.doctorName.replace(/^dr\.?\s*/i, "")}` : ""}</span></td>
                <td className="px-4 py-3">{p.fileCount}</td>
                <td className="px-4 py-3">{p.liveOrders > 0 ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">{p.liveOrders} waiting</span> : "—"}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${RX_STYLE[p.status] ?? ""}`}>{RX_LABEL[p.status] ?? p.status}</span></td>
                <td className="px-4 py-3 text-slate-600">{dateTime(p.createdAt)}{(p.status === "pending" || p.status === "needs_info") && <span className="block text-xs text-slate-500">waiting {waiting(p.createdAt)}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > PAGE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Page {page} of {Math.ceil(total / PAGE)}</span>
          <span className="flex gap-2">{page > 1 && <Link className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50" href={href({ page: String(page - 1) })}>Previous</Link>}{page * PAGE < total && <Link className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50" href={href({ page: String(page + 1) })}>Next</Link>}</span>
        </div>
      )}
    </div>
  );
}
