import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { listUserPrescriptions } from "@/server/prescriptions/service";
import { RX_LABEL, RX_STYLE, rxState } from "@/lib/prescriptionStatus";
import { dateTime } from "@/lib/orderStatus";

export const metadata: Metadata = { title: "My prescriptions", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PrescriptionsPage() {
  const claims = await requireUser("/account/prescriptions");
  const list = await listUserPrescriptions(claims.userId);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">My prescriptions</h2>
        <Link href="/account/prescriptions/new" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"><Plus className="h-4 w-4" /> Upload a prescription</Link>
      </div>
      {list.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <FileText className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 font-semibold">No prescriptions yet</p>
          <p className="mt-1 text-sm text-slate-600">You only need one for medicines marked &ldquo;Prescription required&rdquo;.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {list.map((p) => {
            const st = rxState(p);
            return (
              <li key={p.id}>
                <Link href={`/account/prescriptions/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 hover:border-teal-300">
                  <div>
                    <p className="font-semibold">{p.doctorName ? `Dr ${p.doctorName.replace(/^dr\.?\s*/i, "")}` : "Prescription"}{p.patientName ? ` · ${p.patientName}` : ""}</p>
                    <p className="text-sm text-slate-500">Uploaded {dateTime(p.createdAt)} · {p.files.length} file{p.files.length === 1 ? "" : "s"}{p.validUntil && p.status === "approved" ? ` · valid until ${p.validUntil}` : ""}</p>
                    {p.status === "approved" && !p.expired && p.items.length > 0 && <p className="mt-1 text-xs text-slate-600">{p.items.map((i) => `${i.name}: ${i.remaining} of ${i.maxQty} left`).join(" · ")}</p>}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${RX_STYLE[st] ?? ""}`}>{RX_LABEL[st] ?? st}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
