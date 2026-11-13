import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { Detail, H2, LegalPage, POLICY_DATE } from "@/components/legal/LegalPage";
import { businessInfo } from "@/server/orders/settings";

export const metadata: Metadata = { title: "Contact us", description: "Phone, email and address for MedNeed pharmacy, Bhubaneswar." };

export default async function ContactPage() {
  const b = await businessInfo();
  const tel = b.phone.replace(/[^\d+]/g, "");
  const rows = [
    { icon: Phone, label: "Phone / WhatsApp", body: b.phone ? <a href={`tel:${tel.startsWith("+") ? tel : `+91${tel}`}`} className="font-semibold text-ink hover:underline">{b.phone}</a> : <Detail value="" missing="phone" /> },
    { icon: Mail, label: "Email", body: b.email ? <a href={`mailto:${b.email}`} className="break-all font-semibold text-ink hover:underline">{b.email}</a> : <Detail value="" missing="support email" /> },
    { icon: Clock, label: "Hours", body: <span className="font-semibold text-ink">Every day, {b.hoursLabel}</span> },
    { icon: MapPin, label: "Address", body: <span className="text-ink"><Detail value={b.address} missing="address" /></span> },
  ];
  return (
    <LegalPage title="Contact us" updated={POLICY_DATE} reviewed>
      <p>For help with an order, a prescription or a refund, reach us any of these ways. Please keep your order number handy.</p>
      <ul className="!mt-6 grid gap-3 sm:grid-cols-2">
        {rows.map(({ icon: Icon, label, body }) => (
          <li key={label} className="flex gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tint text-tint-fg"><Icon className="h-5 w-5" aria-hidden /></span>
            <span className="min-w-0 text-sm">
              <span className="block text-ink-muted">{label}</span>
              {body}
            </span>
          </li>
        ))}
      </ul>

      <H2>Business details</H2>
      <p className="flex gap-2">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" aria-hidden />
        <span>
          {b.legalName} · Drug licence no. <Detail value={b.drugLicense} missing="drug licence number" /> · GSTIN <Detail value={b.gstin} missing="GSTIN" />
          {b.pharmacistName && (
            <>
              <br />
              Registered pharmacist: {b.pharmacistName}
              {b.pharmacistRegNo && <> (Reg. no. {b.pharmacistRegNo})</>}
            </>
          )}
        </span>
      </p>

      <H2>Complaints</H2>
      <p>
        If we have not resolved your issue, write to our Grievance Officer{b.grievanceName ? <>, {b.grievanceName},</> : null} at <Detail value={b.grievanceEmail} missing="grievance email" />. We acknowledge complaints within 48 hours and aim to resolve them within 30 days.
      </p>
    </LegalPage>
  );
}
