import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getUserPrescription } from "@/server/prescriptions/service";
import { RX_LABEL, RX_STYLE, fileUrl, rxState } from "@/lib/prescriptionStatus";
import { STATUS_LABEL, dateTime } from "@/lib/orderStatus";
import { PrescriptionActions } from "./PrescriptionActions";
import { LiveRefresh } from "@/lib/live";
import { AskStoreButton } from "@/components/chat/AskStoreButton";

export const metadata: Metadata = { title: "Prescription", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PrescriptionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ uploaded?: string }> }) {
  const { id } = await params;
  const claims = await requireUser(`/account/prescriptions/${id}`);
  const p = await getUserPrescription(claims.userId, id);
  if (!p) notFound();
  const uploaded = (await searchParams).uploaded === "1";
  const st = rxState(p);
  return (
    <div className="space-y-5">
      <LiveRefresh topics={["prescription"]} match={{ key: "prescription", value: p.id }} />
      {uploaded && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
          <div><p className="font-bold">Prescription received</p><p className="mt-1 text-sm">Our pharmacist will check it shortly. You can order your medicines now; we will hold the order until it is verified.</p></div>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Link href="/account/prescriptions" className="text-sm text-teal-700 hover:underline">← My prescriptions</Link>
          <h2 className="mt-1 text-2xl font-bold">Prescription</h2><p className="text-sm text-slate-500">Uploaded {dateTime(p.createdAt)}</p></div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${RX_STYLE[st] ?? ""}`}>{RX_LABEL[st] ?? st}</span>
      </div>

      {p.status === "needs_info" && <p className="rounded-xl bg-orange-50 p-4 text-sm text-orange-900"><strong>Our pharmacist asks:</strong> {p.reviewNote}</p>}
      {p.status === "rejected" && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"><strong>Not accepted:</strong> {p.reviewNote}. You can upload a new prescription.</p>}
      {p.status === "approved" && p.expired && <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">This prescription expired on {p.validUntil}. Please upload a new one.</p>}

      {p.status === "approved" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm" aria-label="What this prescription covers">
          <h3 className="font-bold">What it covers</h3>
          <p className="mt-1 text-slate-600">Dr {p.doctorName.replace(/^dr\.?\s*/i, "")}{p.doctorRegNo ? ` (reg. ${p.doctorRegNo})` : ""}{p.patientName ? ` · for ${p.patientName}` : ""} · written {p.prescribedOn} · valid until {p.validUntil}</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {p.items.map((i) => (
              <li key={i.medicineId} className="flex justify-between gap-3 py-2"><span><span className="font-medium">{i.name}</span><span className="block text-xs text-slate-500">{i.packSize}</span></span><span className="text-right"><span className="font-semibold">{i.remaining} left</span><span className="block text-xs text-slate-500">of {i.maxQty} approved</span></span></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">You can use this prescription for repeat orders until the quantities run out or it expires. Cancelled orders give their units back.</p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Your files">
        <h3 className="font-bold">Your files</h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {p.files.map((f, i) => (
            <li key={f.id}>
              <a href={fileUrl(p.id, f.id)} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-slate-200 hover:border-teal-400">
                {f.mime === "application/pdf" ? <span className="flex h-32 items-center justify-center bg-slate-50 text-sm font-semibold text-slate-600">PDF {i + 1}</span>
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={fileUrl(p.id, f.id)} alt={`Prescription page ${i + 1}`} className="h-32 w-full object-cover" />}
              </a>
            </li>
          ))}
        </ul>
        {p.customerNote && <p className="mt-3 text-sm text-slate-600">Your message: {p.customerNote}</p>}
      </section>

      {p.orders.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm" aria-label="Orders">
          <h3 className="font-bold">Orders placed with it</h3>
          <ul className="mt-2 space-y-1">{p.orders.map((o) => <li key={o.id}><Link href={`/account/orders/${o.id}`} className="text-teal-700 hover:underline">Order {o.orderNumber}</Link> <span className="text-slate-500">· {STATUS_LABEL[o.status] ?? o.status}</span></li>)}</ul>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Progress">
        <h3 className="font-bold">Progress</h3>
        <ol className="mt-3 space-y-2 text-sm">{p.events.map((e, i) => <li key={i} className="flex justify-between gap-3"><span>{e.note || e.status}</span><span className="shrink-0 text-slate-500">{dateTime(e.at)}</span></li>)}</ol>
      </section>

      <AskStoreButton type="prescription" id={p.id} label={`Prescription of ${new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`} />

      <PrescriptionActions id={p.id} status={p.status} canRemove={p.orders.every((o) => o.status === "cancelled" || o.status === "expired")} />
    </div>
  );
}
