import type { Metadata } from "next";
import Link from "next/link";
import { Detail, H2, LegalPage, POLICY_DATE, UL } from "@/components/legal/LegalPage";
import { businessInfo } from "@/server/orders/settings";

export const metadata: Metadata = { title: "Cancellation & refund policy", description: "How to cancel a MedNeed order, when medicines can be returned, and how refunds are paid." };

export default async function RefundsPage() {
  const b = await businessInfo();
  return (
    <LegalPage title="Cancellation & refund policy" updated={POLICY_DATE} reviewed={b.reviewed}>
      <H2>Cancelling an order</H2>
      <UL>
        <li>You can cancel an order yourself from <Link href="/account/orders" className="underline">My orders</Link> until we start preparing it.</li>
        <li>Once it is being packed or is out for delivery, it can no longer be cancelled online. Please call us on <Detail value={b.phone} missing="phone" /> and we will help where we can.</li>
        <li>An online payment that is not completed in time cancels the order automatically. Nothing is charged.</li>
        <li>We may cancel an order if our pharmacist cannot approve the prescription, an item becomes unavailable, or the address is outside our delivery area. We will tell you why.</li>
      </UL>

      <H2>Returns</H2>
      <p>For your safety, medicines cannot be returned once delivered, because we cannot be sure how they were stored. We will replace the item or refund you if:</p>
      <UL>
        <li>you received a wrong item or wrong quantity;</li>
        <li>the item or its seal was damaged when it arrived; or</li>
        <li>the item was already expired, or too close to its expiry date to be used as prescribed, when it arrived.</li>
      </UL>
      <p>
        Please tell us within <strong>48 hours</strong> of delivery, with a photo of the item, its packaging and the invoice, by phone or at <Detail value={b.email} missing="support email" />. Keep the item unused and in its original pack. Temperature-sensitive items (such as insulin and vaccines) and opened or used items cannot be returned for any other reason.
      </p>

      <H2>Refunds</H2>
      <UL>
        <li><strong>Paid online:</strong> refunds go back to the same card, UPI account, wallet or bank account you paid from. We start the refund straight away when an order is cancelled or a return is approved; your bank usually credits it within 5 to 7 working days.</li>
        <li><strong>Cash on delivery:</strong> nothing is charged for a cancelled order. For an approved return, we refund to your bank account or UPI ID.</li>
        <li>If a refund has not reached you after 7 working days, contact us with your order number and we will share the bank reference.</li>
      </UL>

      <H2>Contact</H2>
      <p>
        Phone <Detail value={b.phone} missing="phone" /> ({b.hoursLabel}, every day), email <Detail value={b.email} missing="support email" />.
      </p>
    </LegalPage>
  );
}
