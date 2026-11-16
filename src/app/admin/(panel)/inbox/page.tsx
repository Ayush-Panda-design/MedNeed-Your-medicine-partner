import type { Metadata } from "next";
import { requireStaff } from "@/server/auth/session";
import { InboxClient } from "./InboxClient";

export const metadata: Metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

export default async function InboxPage() {
  await requireStaff("/admin/inbox", ["admin", "pharmacist"]);
  return <InboxClient />;
}
