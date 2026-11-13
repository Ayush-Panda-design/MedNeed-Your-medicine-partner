import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getUserById, publicUser } from "@/server/auth/users";
import { ProfilePanels } from "./ProfilePanels";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const claims = await requireUser("/account");
  const user = await getUserById(claims.userId);
  if (!user) notFound();
  const { welcome } = await searchParams;
  return <ProfilePanels user={publicUser(user)} welcome={welcome === "1"} />;
}
