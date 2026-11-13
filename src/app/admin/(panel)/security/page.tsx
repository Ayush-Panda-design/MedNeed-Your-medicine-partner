import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { query } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { remainingRecoveryCodes } from "@/server/auth/admin2fa";
import { SignOutEverywhere } from "./SignOutEverywhere";

export const metadata: Metadata = { title: "Security" };
const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export default async function SecurityPage() {
  const { user, claims } = await requireStaff("/admin/security");
  const [codes, sessions] = await Promise.all([
    remainingRecoveryCodes(user.id),
    query<{ id: string; ip: string | null; user_agent: string | null; last_used_at: string; created_at: string; tfa_verified: boolean }>(
      `select id, ip, user_agent, last_used_at, created_at, tfa_verified from sessions
       where user_id = $1 and revoked_at is null and expires_at > now() order by last_used_at desc limit 20`,
      [user.id],
    ),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Security</h1>
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold">Two-factor authentication</h2>
        <p className="mt-2 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Enabled for {user.email}</p>
        <p className="mt-2 text-sm text-slate-600">{codes} unused recovery code{codes === 1 ? "" : "s"} remaining.{codes <= 2 && " Ask another admin to reset your 2FA before you run out."}</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold">Active sessions</h2>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span>
                <span className="block max-w-md truncate font-medium">{s.user_agent ?? "Unknown device"}</span>
                <span className="text-xs text-slate-500">{s.ip ?? "unknown IP"} · last active {fmt.format(new Date(s.last_used_at))}{!s.tfa_verified && " · no 2FA (cannot open admin)"}</span>
              </span>
              {s.id === claims.sid && <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">This device</span>}
            </li>
          ))}
        </ul>
        <SignOutEverywhere />
      </section>
    </div>
  );
}
