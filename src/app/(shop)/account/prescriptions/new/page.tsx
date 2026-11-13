import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { safeNext } from "@/server/http";
import { NewPrescription } from "./NewPrescription";

export const metadata: Metadata = { title: "Upload a prescription", robots: { index: false } };

export default async function NewPrescriptionPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await requireUser("/account/prescriptions/new");
  const next = safeNext((await searchParams).next, "");
  return (
    <div>
      <Link href="/account/prescriptions" className="text-sm text-teal-700 hover:underline">← My prescriptions</Link>
      <h2 className="mt-1 text-lg font-bold">Upload a prescription</h2>
      <p className="mt-1 text-sm text-slate-600">Our pharmacist checks it, usually within a few hours during shop hours. Once approved you can use it again for refills until it runs out or expires.</p>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5"><NewPrescription next={next} /></div>
    </div>
  );
}
