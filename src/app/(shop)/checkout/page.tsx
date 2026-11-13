import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { listAddresses } from "@/server/auth/addresses";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const claims = await requireUser("/checkout");
  return <CheckoutForm initialAddresses={await listAddresses(claims.userId)} />;
}
