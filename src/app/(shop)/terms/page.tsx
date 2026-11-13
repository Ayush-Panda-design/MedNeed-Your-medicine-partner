import type { Metadata } from "next";
import Link from "next/link";
import { Detail, H2, LegalPage, POLICY_DATE, UL } from "@/components/legal/LegalPage";
import { businessInfo } from "@/server/orders/settings";

export const metadata: Metadata = { title: "Terms of use", description: "The terms for buying medicines and health products from MedNeed." };

export default async function TermsPage() {
  const b = await businessInfo();
  return (
    <LegalPage title="Terms of use" updated={POLICY_DATE} reviewed={b.reviewed}>
      <p>
        These terms apply when you use this website or buy from <strong>{b.legalName}</strong>, a licensed retail pharmacy (drug licence no. <Detail value={b.drugLicense} missing="drug licence number" />, GSTIN <Detail value={b.gstin} missing="GSTIN" />). By creating an account or placing an order you agree to them, together with our <Link href="/privacy" className="underline">Privacy policy</Link>, <Link href="/refunds" className="underline">Cancellation &amp; refund policy</Link> and <Link href="/shipping" className="underline">Shipping policy</Link>.
      </p>

      <H2>Who can use the service</H2>
      <UL>
        <li>You must be at least 18 years old and able to enter into a contract under Indian law.</li>
        <li>You are responsible for your account and for keeping your sign-in details private.</li>
        <li>The information you give us, including delivery addresses and prescriptions, must be true and your own (or that of the patient you are ordering for, with their permission).</li>
      </UL>

      <H2>Prescription medicines</H2>
      <UL>
        <li>Medicines that need a prescription are supplied only against a valid prescription from a registered medical practitioner, verified by our registered pharmacist{b.pharmacistName ? <> ({b.pharmacistName}{b.pharmacistRegNo ? `, Reg. no. ${b.pharmacistRegNo}` : ""})</> : null}.</li>
        <li>Our pharmacist may refuse, reduce or ask questions about any order, for example if the prescription is unclear, expired, altered, or the quantity is not appropriate. If an order is refused, any amount paid is refunded in full.</li>
        <li>An approved prescription can be reused for repeat orders until it expires (normally {b.rxValidityDays} days from the date it was written, or earlier if the doctor says so) and within the quantities it allows.</li>
        <li>Some medicines (for example Schedule X and other restricted drugs) are never sold online.</li>
        <li>We do not substitute a different brand without your consent.</li>
      </UL>

      <H2>Health information on this site</H2>
      <p>
        Product descriptions, the help chat and any other information on this site are for general awareness only. They are not medical advice and do not replace a consultation with your doctor or pharmacist. Do not start, stop or change a medicine based only on information from this site.
      </p>

      <H2>Prices and payment</H2>
      <UL>
        <li>All prices are in Indian rupees and include GST. We never charge more than the printed MRP.</li>
        <li>The final price is confirmed when you place the order. If a price or stock changes before then, we will show you the new total and you can decide whether to continue.</li>
        <li>You can pay online (through Razorpay){b.cod.enabled ? <> or cash on delivery for orders up to ₹{b.cod.max.toLocaleString("en-IN")}</> : null}.</li>
        <li>An online payment that is not completed within the time shown at checkout cancels the order automatically and releases the stock.</li>
      </UL>

      <H2>Delivery</H2>
      <p>Delivery areas, charges and timings are set out in the <Link href="/shipping" className="underline">Shipping policy</Link>. Ownership and risk pass to you when the order is handed over and the delivery code is confirmed.</p>

      <H2>Cancellations, returns and refunds</H2>
      <p>See the <Link href="/refunds" className="underline">Cancellation &amp; refund policy</Link>.</p>

      <H2>Acceptable use</H2>
      <p>You must not misuse the site: for example by submitting forged prescriptions, ordering for resale, trying to access other people&apos;s data, or interfering with the site&apos;s security. We may suspend accounts that do, and report forged prescriptions to the authorities.</p>

      <H2>Liability</H2>
      <p>
        We take care that the medicines we supply are genuine, correctly stored and within their expiry date. To the extent the law allows, we are not liable for indirect losses, or for harm caused by using a medicine other than as prescribed or as directed on its label. Nothing in these terms limits your rights under the Consumer Protection Act, 2019.
      </p>

      <H2>Governing law</H2>
      <p>These terms are governed by the laws of India. Courts in Bhubaneswar, Odisha have jurisdiction, without affecting your right to approach a consumer commission.</p>

      <H2>Contact</H2>
      <p>
        {b.legalName}, <Detail value={b.address} missing="address" />. Phone <Detail value={b.phone} missing="phone" />, email <Detail value={b.email} missing="support email" />.
      </p>
    </LegalPage>
  );
}
