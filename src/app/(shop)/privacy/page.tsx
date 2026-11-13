import type { Metadata } from "next";
import Link from "next/link";
import { Detail, H2, LegalPage, POLICY_DATE, UL } from "@/components/legal/LegalPage";
import { businessInfo } from "@/server/orders/settings";

export const metadata: Metadata = { title: "Privacy policy", description: "How MedNeed collects, uses, protects and deletes your personal and health information." };

export default async function PrivacyPage() {
  const b = await businessInfo();
  return (
    <LegalPage title="Privacy policy" updated={POLICY_DATE} reviewed={b.reviewed}>
      <p>
        This policy explains how <strong>{b.legalName}</strong> (&ldquo;MedNeed&rdquo;, &ldquo;we&rdquo;), a retail pharmacy in {b.state}, India, handles your personal data when you use this website. We follow the Digital Personal Data Protection Act, 2023, the Information Technology Act, 2000 and the rules made under them. Health information such as prescriptions is treated as sensitive and protected accordingly.
      </p>

      <H2>What we collect</H2>
      <UL>
        <li><strong>Account details:</strong> your name, mobile number and/or email address, and a password if you choose to set one (stored only as a one-way hash). If you sign in with Google, we receive your name and email from Google.</li>
        <li><strong>Delivery details:</strong> the addresses you save and, if you choose to drop a pin, the location of that address, so we can check the delivery distance.</li>
        <li><strong>Prescriptions:</strong> the images or PDFs you upload, and the details a pharmacist records when verifying them (doctor, patient name, medicines, validity).</li>
        <li><strong>Orders:</strong> what you order, prices, invoices, delivery status and the batches dispensed (required by drug laws for recalls).</li>
        <li><strong>Payments:</strong> online payments are handled by Razorpay. We receive a payment reference and status, never your full card, UPI PIN or bank login.</li>
        <li><strong>Technical data:</strong> your IP address and browser type, used for security (for example, to stop repeated failed sign-ins) and kept in our logs for a limited time.</li>
      </UL>

      <H2>Why we use it</H2>
      <UL>
        <li>To verify prescriptions, dispense medicines legally, deliver your order and give you an invoice.</li>
        <li>To send you messages about your order (by SMS, WhatsApp or email). These messages never name your medicines.</li>
        <li>Refill reminders, only if you switch them on. You can turn them off at any time in your account.</li>
        <li>To keep the service secure, prevent fraud and meet our legal and tax obligations.</li>
      </UL>
      <p>We do <strong>not</strong> sell your data, and we do not use your health information for advertising.</p>

      <H2>Who we share it with</H2>
      <p>Only with service providers that help us run the pharmacy, each bound to use the data only for that purpose:</p>
      <UL>
        <li>Razorpay (payments and refunds).</li>
        <li>SMS, WhatsApp and email delivery providers (order messages and sign-in codes).</li>
        <li>Our hosting and storage providers (where the website and its encrypted files are kept).</li>
        <li>Google, if you choose Google sign-in; and Google&apos;s Gemini AI service, which may be used to help our pharmacists read prescription images and to answer general questions in the help chat. A registered pharmacist always makes the final decision on every prescription.</li>
        <li>Government authorities, when the law requires it (for example, a drug inspector&apos;s audit of prescription records).</li>
      </UL>

      <H2>How we protect it</H2>
      <UL>
        <li>Prescription files are encrypted at rest and can be opened only by you and by verified pharmacy staff.</li>
        <li>Staff accounts require two-factor authentication, and every access to sensitive records is logged.</li>
        <li>All connections to the site use HTTPS.</li>
      </UL>

      <H2>How long we keep it</H2>
      <p>
        We keep prescriptions and dispensing records for as long as drug and tax laws require pharmacies to keep them, and invoices for the period required by GST law. Other account data is kept while your account is active. When it is no longer needed, it is deleted or anonymised.
      </p>

      <H2>Your rights</H2>
      <p>You can ask us to:</p>
      <UL>
        <li>tell you what personal data we hold about you and how it is used;</li>
        <li>correct or update it (most details you can change yourself in <Link href="/account" className="underline">your account</Link>);</li>
        <li>delete your account and data, except records we must keep by law;</li>
        <li>withdraw consent for optional uses such as refill reminders;</li>
        <li>nominate another person to exercise these rights if you are unable to.</li>
      </UL>
      <p>Write to us at <Detail value={b.email} missing="support email" />. We will reply within 30 days.</p>

      <H2>Children</H2>
      <p>You must be 18 or older to create an account. A parent or guardian may order medicines for a child.</p>

      <H2>Cookies</H2>
      <p>We use only essential cookies to keep you signed in and to keep your cart, and your browser&apos;s storage to remember your light or dark theme. We do not use advertising or tracking cookies.</p>

      <H2>Grievance Officer</H2>
      <p>
        <Detail value={b.grievanceName} missing="Grievance Officer name" />
        <br />
        Email: <Detail value={b.grievanceEmail} missing="grievance email" />
        <br />
        Address: <Detail value={b.address} missing="address" />
      </p>
      <p>If you are not satisfied with our response, you may complain to the Data Protection Board of India.</p>

      <H2>Changes</H2>
      <p>If we change this policy, we will update the date at the top. Significant changes will be shown on the site before they take effect.</p>
    </LegalPage>
  );
}
