import type { Metadata } from "next";
import Link from "next/link";
import { Detail, H2, LegalPage, POLICY_DATE, UL } from "@/components/legal/LegalPage";
import { businessInfo } from "@/server/orders/settings";

export const metadata: Metadata = { title: "Shipping & delivery policy", description: "Where MedNeed delivers, delivery charges, timings and store pickup." };

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default async function ShippingPage() {
  const b = await businessInfo();
  const d = b.delivery;
  const bands = d.feeBands;
  return (
    <LegalPage title="Shipping & delivery policy" updated={POLICY_DATE} reviewed={b.reviewed}>
      <p>We deliver from our own pharmacy in Bhubaneswar using our own delivery staff. We do not ship by courier to other cities.</p>

      <H2>Where we deliver</H2>
      {d.enabled ? (
        <UL>
          <li>Addresses within {d.maxRadiusKm} km of the store. The checkout checks your address and tells you before you pay.</li>
          <li>The minimum order for delivery is {inr(d.minOrder)}.</li>
        </UL>
      ) : (
        <p>Home delivery is paused at the moment. You can still order online and collect from the store.</p>
      )}

      {d.enabled && (
        <>
          <H2>Delivery charges</H2>
          <UL>
            {bands.length === 0 && <li>Delivery is free.</li>}
            {bands.map((band, i) => (
              <li key={i}>{band.fee === 0 ? "Free" : inr(band.fee)} for orders below {inr(band.below)}</li>
            ))}
            {bands.length > 0 && <li>Free for orders of {inr(bands[bands.length - 1].below)} or more</li>}
            {d.perKmRate > 0 && <li>Plus {inr(d.perKmRate)} per km for addresses more than {d.freeRadiusKm} km from the store</li>}
          </UL>
          <p>The exact charge is shown at checkout before you pay. It includes GST.</p>
        </>
      )}

      <H2>When it arrives</H2>
      <UL>
        <li>You choose a delivery time slot at checkout{d.slots.length ? <> (currently {d.slots.join(", ")})</> : null}. We are open {b.hoursLabel}.</li>
        <li>Orders with prescription medicines are sent after our pharmacist approves the prescription, which may take a little longer.</li>
        <li>We will message you when your order is packed and when it is out for delivery.</li>
      </UL>

      <H2>Handover</H2>
      <UL>
        <li>To make sure medicines reach the right person, we give you a delivery code. Share it with the delivery person only when you have the parcel.</li>
        <li>Please check the seal and contents. Report any problem within 48 hours (see the <Link href="/refunds" className="underline">refund policy</Link>).</li>
        <li>If nobody is available, we will try again or contact you to arrange another time.</li>
      </UL>

      {b.pickup && (
        <>
          <H2>Store pickup</H2>
          <p>
            You can choose to collect your order from the store at no charge: <Detail value={b.address} missing="address" />.
          </p>
        </>
      )}

      <H2>Questions</H2>
      <p>
        Call <Detail value={b.phone} missing="phone" /> or email <Detail value={b.email} missing="support email" />.
      </p>
    </LegalPage>
  );
}
