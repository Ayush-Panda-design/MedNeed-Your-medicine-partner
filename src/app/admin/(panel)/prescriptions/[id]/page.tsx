import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/auth/session";
import { getPrescriptionForStaff } from "@/server/prescriptions/service";
import { getSettings } from "@/server/orders/settings";
import { aiEnabled } from "@/server/env";
import { RX_LABEL, RX_STYLE, fileUrl, rxState } from "@/lib/prescriptionStatus";
import { STATUS_LABEL, dateTime } from "@/lib/orderStatus";
import { ReviewForm } from "./ReviewForm";

export const metadata: Metadata = { title: "Review prescription" };
export const dynamic = "force-dynamic";

export default async function AdminPrescription({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff(`/admin/prescriptions/${id}`, ["admin", "pharmacist"]);
  const p = await getPrescriptionForStaff(id);
  if (!p || p.status === "withdrawn") notFound();
  const settings = await getSettings();
  const st = rxState(p);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Link href="/admin/prescriptions" className="text-sm text-teal-700 hover:underline">← Prescriptions</Link>
          <h1 className="mt-1 text-2xl font-bold">Prescription from {p.customer.name ?? "customer"}</h1><p className="text-sm text-slate-500">Uploaded {dateTime(p.createdAt)}</p></div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${RX_STYLE[st] ?? ""}`}>{RX_LABEL[st] ?? st}</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <section className="space-y-4" aria-label="Prescription files">
          {p.files.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No files.</p>}
          {p.files.map((f, i) => (
            <figure key={f.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <figcaption className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-sm"><span className="font-medium">Page {i + 1}</span><a href={fileUrl(p.id, f.id)} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">Open full size</a></figcaption>
              {f.mime === "application/pdf"
                ? <iframe src={fileUrl(p.id, f.id)} title={`Prescription PDF ${i + 1}`} className="h-[640px] w-full" />
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={fileUrl(p.id, f.id)} alt={`Prescription page ${i + 1}`} className="w-full" />}
            </figure>
          ))}
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="font-bold">Customer</h2>
            <p className="mt-2 text-slate-700">{p.customer.name ?? "—"}{p.customer.phone ? <><br />+91 {p.customer.phone.slice(-10)}</> : null}{p.customer.email ? <><br />{p.customer.email}</> : null}</p>
            {p.patientName && <p className="mt-2 text-slate-600">Patient: {p.patientName}</p>}
            {p.doctorName && st === "pending" && <p className="text-slate-600">Doctor (as typed by customer): {p.doctorName}</p>}
            {p.customerNote && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-900">Customer says: {p.customerNote}</p>}
          </section>

          {p.orders.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
              <h2 className="font-bold">Orders using this prescription</h2>
              <ul className="mt-2 space-y-3">
                {p.orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold text-teal-700 hover:underline">Order {o.orderNumber}</Link> <span className="text-slate-500">· {STATUS_LABEL[o.status] ?? o.status}</span>
                    {o.lines.length > 0 && <span className="block text-xs text-slate-600">Needs: {o.lines.map((l) => `${l.qty} × ${l.name}`).join("; ")}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.status === "approved" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
              <h2 className="font-bold">Approved</h2>
              <p className="mt-2 text-slate-700">Dr {p.doctorName.replace(/^dr\.?\s*/i, "")}{p.doctorRegNo ? ` (reg. ${p.doctorRegNo})` : ""} · written {p.prescribedOn} · valid until {p.validUntil}</p>
              <ul className="mt-2 divide-y divide-slate-100">{p.items.map((i) => <li key={i.medicineId} className="flex justify-between py-1.5"><span>{i.name} <span className="text-xs text-slate-500">{i.packSize}</span></span><span>{i.remaining} of {i.maxQty} left</span></li>)}</ul>
              {p.reviewNote && <p className="mt-2 text-slate-600">Note: {p.reviewNote}</p>}
            </section>
          )}
          {p.status === "rejected" && <p className="rounded-2xl bg-rose-50 p-5 text-sm text-rose-800">Rejected: {p.reviewNote}</p>}

          {(p.status === "pending" || p.status === "needs_info") && (
            <ReviewForm id={p.id} status={p.status} reviewNote={p.reviewNote} validityDays={settings.prescriptions.validityDays}
              initial={{ doctorName: p.doctorName, patientName: p.patientName }} suggested={p.suggested} aiEnabled={aiEnabled()} />
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="font-bold">History</h2>
            <ol className="mt-2 space-y-2">{p.events.map((e, i) => <li key={i} className="flex justify-between gap-3"><span>{e.note || e.status}{e.actor ? <span className="text-slate-400"> · {e.actor}</span> : null}</span><span className="shrink-0 text-slate-500">{dateTime(e.at)}</span></li>)}</ol>
          </section>
        </div>
      </div>
    </div>
  );
}
