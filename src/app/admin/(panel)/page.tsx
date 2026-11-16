import Link from "next/link";
import { query } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { LiveRefresh } from "@/lib/live";

const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export default async function DashboardPage() {
  const { user } = await requireStaff("/admin");
  const [counts] = await query<{ users: number; staff: number; week: number; sessions: number }>(`
    select
      (select count(*)::int from users) as users,
      (select count(distinct user_id)::int from user_roles where role in ('admin','pharmacist','inventory_manager')) as staff,
      (select count(*)::int from users where created_at > now() - interval '7 days') as week,
      (select count(*)::int from sessions where revoked_at is null and expires_at > now()) as sessions`);
  const isAdmin = user.roles.includes("admin");
  const events = isAdmin
    ? await query<{ action: string; created_at: string; email: string | null }>(
        `select a.action, a.created_at, u.email from audit_log a left join users u on u.id = a.user_id order by a.id desc limit 12`,
      )
    : [];

  const canSeeOrders = user.roles.includes("admin") || user.roles.includes("pharmacist");
  const [ord] = canSeeOrders
    ? await query<{ open: number; today: number; rx: number }>(`
        select (select count(*)::int from orders where status in ('confirmed','packed','out_for_delivery')) as open,
               (select count(*)::int from orders where created_at > now() - interval '24 hours') as today,
               (select count(*)::int from prescriptions where status = 'pending')
               + (select count(*)::int from orders o where o.prescription_status = 'pending' and o.status in ('confirmed','packed','out_for_delivery') and not exists (select 1 from order_prescriptions op where op.order_id = o.id)) as rx`)
    : [];
  const stats: { label: string; value: number; href?: string }[] = [
    ...(ord ? [{ label: "Orders to pack or deliver", value: ord.open, href: "/admin/fulfilment" }, { label: "Prescriptions to check", value: ord.rx, href: "/admin/prescriptions" }, { label: "Orders in the last 24 hours", value: ord.today, href: "/admin/orders?status=all" }] : []),
    { label: "Registered users", value: counts.users },
    { label: "Staff accounts", value: counts.staff },
    { label: "New in the last 7 days", value: counts.week },
    { label: "Active sessions", value: counts.sessions },
  ];

  return (
    <div className="space-y-8">
      <LiveRefresh topics={["order"]} />
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.name?.split(" ")[0] ?? "there"}</h1>
        <p className="mt-1 text-sm text-slate-500">Open orders are under Orders. Stock and expiry alerts are under Inventory.</p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <dt className="text-sm text-slate-500">{"href" in s && s.href ? <Link href={s.href} className="hover:text-teal-700 hover:underline">{s.label}</Link> : s.label}</dt>
            <dd className="mt-2 text-3xl font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>
      {isAdmin && (
        <section className="rounded-2xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 px-5 py-4 font-bold">Recent security activity</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {events.length === 0 && <li className="px-5 py-4 text-slate-500">No activity yet.</li>}
            {events.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-4 px-5 py-3">
                <span><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{e.action}</code> <span className="ml-2 text-slate-500">{e.email ?? "anonymous"}</span></span>
                <time className="shrink-0 text-xs text-slate-400">{fmt.format(new Date(e.created_at))}</time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
