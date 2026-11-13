import type { Metadata } from "next";
import Link from "next/link";
import { H2, LegalPage, POLICY_DATE, UL } from "@/components/legal/LegalPage";
import { businessInfo } from "@/server/orders/settings";

export const metadata: Metadata = { title: "About us", description: "MedNeed is a licensed neighbourhood pharmacy in Bhubaneswar, now delivering online." };

export default async function AboutPage() {
  const b = await businessInfo();
  return (
    <LegalPage title="About MedNeed" updated={POLICY_DATE} reviewed>
      <p>
        {b.name} is a licensed retail pharmacy in Bhubaneswar. This website lets you order the same genuine medicines and health products you would buy at our counter, and have them delivered to your door by our own staff.
      </p>
      <H2>How we work</H2>
      <UL>
        <li>Every medicine comes from licensed distributors, is stored as the manufacturer requires, and is dispensed oldest-expiry-first so you never get stock close to expiry.</li>
        <li>Prescription medicines are checked by a registered pharmacist before they leave the store.</li>
        <li>Prices never exceed MRP, and you get a GST invoice with every order.</li>
        <li>Your prescriptions are encrypted and seen only by you and our pharmacy staff.</li>
      </UL>
      <p>
        Questions? <Link href="/contact" className="underline">Contact us</Link>.
      </p>
    </LegalPage>
  );
}
