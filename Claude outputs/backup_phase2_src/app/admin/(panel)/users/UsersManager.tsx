"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { api } from "@/lib/api";

export type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: "active" | "disabled";
  roles: string[];
  lastLoginAt: string | null;
  createdAt: string;
};

const STAFF = [
  { key: "admin", label: "Admin", hint: "Full access, manages staff" },
  { key: "pharmacist", label: "Pharmacist", hint: "Verifies prescriptions and orders" },
  { key: "inventory_manager", label: "Inventory manager", hint: "Catalog and stock" },
] as const;

const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
const chip = (role: string) =>
  role === "admin" ? "bg-violet-100 text-violet-700" : role === "customer" ? "bg-slate-100 text-slate-600" : "bg-teal-100 text-teal-700";

export function UsersManager({ users, meId }: { users: UserRow[]; meId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", roles: [] as string[] });

  const toggle = (list: string[], r: string) => (list.includes(r) ? list.filter((x) => x !== r) : [...list, r]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const res = await api(`/api/admin/users/${id}`, { method: "PATCH", body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api("/api/admin/users", { body: form });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setCreating(false);
    setForm({ name: "", email: "", password: "", roles: [] });
    router.refresh();
  }

  const field = "mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => { setCreating(true); setError(""); }} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"><UserPlus className="h-4 w-4" /> Add staff member</button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Roles</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last sign-in</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No users match.</td></tr>}
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{u.name ?? <span className="text-slate-400">No name</span>}{u.id === meId && <span className="ml-2 text-xs text-slate-400">(you)</span>}</p>
                  <p className="text-xs text-slate-500">{[u.email, u.phone].filter(Boolean).join(" · ") || "—"}</p>
                </td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{u.roles.map((r) => <span key={r} className={`rounded-full px-2 py-0.5 text-xs font-medium ${chip(r)}`}>{r.replace("_", " ")}</span>)}</div></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{u.status}</span></td>
                <td className="px-4 py-3 text-slate-500">{u.lastLoginAt ? fmt.format(new Date(u.lastLoginAt)) : "Never"}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => { setEditing(u); setRoles(u.roles.filter((r) => r !== "customer")); setError(""); }} className="rounded-lg px-3 py-1.5 font-medium text-teal-700 hover:bg-teal-50">Manage</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={`Manage ${editing.name ?? editing.email ?? editing.phone}`} onClose={() => setEditing(null)}>
          <fieldset>
            <legend className="text-sm font-semibold">Staff roles</legend>
            <p className="mt-1 text-xs text-slate-500">Leave all unticked for a regular customer.</p>
            <div className="mt-3 space-y-2">
              {STAFF.map((s) => (
                <label key={s.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                  <input type="checkbox" checked={roles.includes(s.key)} onChange={() => setRoles((r) => toggle(r, s.key))} className="mt-1 accent-teal-600" />
                  <span><span className="block text-sm font-medium">{s.label}</span><span className="text-xs text-slate-500">{s.hint}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button disabled={busy} onClick={() => patch(editing.id, { roles })} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-70">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save roles</button>
            <button disabled={busy} onClick={() => patch(editing.id, { status: editing.status === "active" ? "disabled" : "active" })} className={`rounded-xl border px-5 py-2.5 text-sm font-semibold ${editing.status === "active" ? "border-rose-300 text-rose-700 hover:bg-rose-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}>
              {editing.status === "active" ? "Disable account" : "Enable account"}
            </button>
          </div>
          {editing.id !== meId && editing.roles.some((r) => r !== "customer") && (
            <button
              disabled={busy}
              onClick={() => window.confirm("Reset two-factor authentication for this person? They will set it up again at their next sign-in.") && patch(editing.id, { resetTwoFactor: true })}
              className="mt-3 text-sm font-medium text-slate-600 underline hover:text-slate-900"
            >
              Reset two-factor authentication
            </button>
          )}
          <p className="mt-3 text-xs text-slate-500">Saving roles, disabling an account or resetting 2FA signs that person out of all devices.</p>
        </Modal>
      )}

      {creating && (
        <Modal title="Add staff member" onClose={() => setCreating(false)}>
          <form onSubmit={createStaff} noValidate>
            <label htmlFor="s-name" className="text-sm font-medium">Full name</label>
            <input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} />
            <label htmlFor="s-email" className="mt-4 block text-sm font-medium">Work email</label>
            <input id="s-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={field} />
            <label htmlFor="s-pw" className="mt-4 block text-sm font-medium">Temporary password</label>
            <input id="s-pw" type="text" autoComplete="off" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={field} />
            <p className="mt-1 text-xs text-slate-500">Share it securely. They will set up two-factor authentication at first sign-in.</p>
            <fieldset className="mt-4">
              <legend className="text-sm font-medium">Roles</legend>
              <div className="mt-2 space-y-2">
                {STAFF.map((s) => (
                  <label key={s.key} className="flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={form.roles.includes(s.key)} onChange={() => setForm({ ...form, roles: toggle(form.roles, s.key) })} className="accent-teal-600" /> {s.label}</label>
                ))}
              </div>
            </fieldset>
            {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <button disabled={busy} type="submit" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-70">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Create account</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
