"use client";

import { useRouter } from "next/navigation";
import { PrescriptionUploader } from "@/components/PrescriptionUploader";

export function NewPrescription({ next }: { next: string }) {
  const router = useRouter();
  return <PrescriptionUploader onUploaded={(id) => router.push(next || `/account/prescriptions/${id}?uploaded=1`)} />;
}
