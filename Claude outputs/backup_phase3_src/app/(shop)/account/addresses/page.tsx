import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { listAddresses } from "@/server/auth/addresses";
import { AddressManager } from "./AddressManager";

export const metadata: Metadata = { title: "Saved addresses" };

export default async function AddressesPage() {
  const claims = await requireUser("/account/addresses");
  return <AddressManager initial={await listAddresses(claims.userId)} />;
}
