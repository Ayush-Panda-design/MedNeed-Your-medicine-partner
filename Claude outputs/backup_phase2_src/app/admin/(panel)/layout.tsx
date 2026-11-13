import type { Metadata } from "next";
import { checkStaff, getAccessClaims } from "@/server/auth/session";
import { AdminShell } from "./AdminShell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | MedNeed Admin" }, robots: { index: false, follow: false } };

/**
 * A layout cannot know which page was requested, so it never redirects itself (that would lose the deep link).
 * Every page in this group MUST call requireStaff("/its/path", roles) - that is the real guard. The layout only
 * draws the shell for verified staff and shows nothing of the admin chrome otherwise.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const check = await checkStaff(await getAccessClaims());
  if (!check.ok) return <>{children}</>;
  const { user } = check;
  return (
    <AdminShell user={{ name: user.name ?? user.email ?? "Staff", email: user.email, roles: user.roles }}>{children}</AdminShell>
  );
}
