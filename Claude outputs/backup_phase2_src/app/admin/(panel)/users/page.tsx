import type { Metadata } from "next";
import Link from "next/link";
import { query } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { UsersManager, type UserRow } from "./UsersManager";

export const metadata: Metadata = { title: "Users & staff" };

type SP = { q?: string; role?: string };

export default async function UsersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { user: me } = await requireStaff("/admin/users", ["admin"]);
  const { q, role } = await searchParams;
  const term = q?.trim() ? `%${q.trim().replace(/[%_\\]/g, "\\$&")}%` : null;
  const roleFilter = ["customer", "admin", "pharmacist", "inventory_manager"].includes(role ?? "") ? role! : null;

  const rows = await query<{
    id: string; name: string | null; email: string | null; phone: string | null; status: "active" | "disabled";
    last_login_at: string | null; created_at: string; roles: string[];
  }>(
    `select u.id, u.name, u.email, u.phone, u.status, u.last_login_at, u.created_at,
            coalesce(array_agg(r.role order by r.role) filter (where r.role is not null), '{}') as roles
     from users u left join user_roles r on r.user_id = u.id
     where ($1::text is null or u.name ilike $1 or u.email ilike $1 or u.phone like $1)
     group by u.id
     having ($2::text is null or $2::text = any(coalesce(array_agg(r.role) filter (where r.role is not null), '{}')))
     order by u.created_at desc limit 100`,
    [term, roleFilter],
  );

  const users: UserRow[] = rows.map((r) => ({
    id: r.id, name: r.name, email: r.email, phone: r.phone, status: r.status, roles: r.roles,
    lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users &amp; staff</h1>
          <p className="mt-1 text-sm text-slate-500">Manage who can access the admin panel. Role changes take effect immediately.</p>
        </div>
      </div>

      <form className="flex flex-wrap gap-3" action="/admin/users">
        <input name="q" defaultValue={q} placeholder="Search name, email or phone" aria-label="Search users" className="min-w-64 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-teal-600" />
        <select name="role" defaultValue={roleFilter ?? ""} aria-label="Filter by role" className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="admin">Admins</option>
          <option value="pharmacist">Pharmacists</option>
          <option value="inventory_manager">Inventory managers</option>
        </select>
        <button className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Search</button>
        {(q || roleFilter) && <Link href="/admin/users" className="self-center text-sm text-teal-700 hover:underline">Clear</Link>}
      </form>

      <UsersManager users={users} meId={me.id} />
      {users.length === 100 && <p className="text-xs text-slate-500">Showing the 100 newest matches. Refine your search to see others.</p>}
    </div>
  );
}
