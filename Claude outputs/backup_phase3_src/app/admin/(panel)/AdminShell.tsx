"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, FileCheck2, LayoutDashboard, LogOut, Package, PackageSearch, ShieldCheck, Store, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/providers";
import { Logo } from "@/components/Logo";

type Shell = { name: string; email: string | null; roles: string[] };

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "pharmacist", "inventory_manager"] },
  { href: "/admin/catalog", label: "Catalog", icon: PackageSearch, roles: ["admin", "pharmacist", "inventory_manager"] },
  { href: "/admin/users", label: "Users & staff", icon: Users, roles: ["admin"] },
  { href: "/admin/security", label: "Security", icon: ShieldCheck, roles: ["admin", "pharmacist", "inventory_manager"] },
];
const soon = [
  { label: "Inventory", icon: Package, roles: ["admin", "inventory_manager"], phase: "Phase 4" },
  { label: "Orders", icon: ClipboardList, roles: ["admin", "pharmacist"], phase: "Phase 6" },
  { label: "Prescriptions", icon: FileCheck2, roles: ["admin", "pharmacist"], phase: "Phase 7" },
];

export function AdminShell({ user, children }: { user: Shell; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const has = (roles: string[]) => roles.some((r) => user.roles.includes(r));

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <aside className="bg-slate-900 text-slate-300 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-5 md:block"><Logo light /><span className="rounded bg-teal-500/20 px-2 py-0.5 text-xs font-semibold text-teal-300 md:mt-2 md:inline-block">Admin</span></div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {nav.filter((n) => has(n.roles)).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={path === href || (href !== "/admin" && path.startsWith(`${href}/`)) ? "page" : undefined} className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium ${path === href || (href !== "/admin" && path.startsWith(`${href}/`)) ? "bg-teal-600 text-white" : "hover:bg-slate-800"}`}>
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
          <p className="mt-4 hidden px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:block">Coming soon</p>
          {soon.filter((n) => has(n.roles)).map(({ label, icon: Icon, phase }) => (
            <span key={label} className="hidden items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-500 md:flex">
              <Icon className="h-4 w-4" /> {label} <span className="ml-auto rounded bg-slate-800 px-1.5 py-0.5 text-[10px]">{phase}</span>
            </span>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-700"><Store className="h-4 w-4" /> View store</Link>
          <div className="flex items-center gap-4">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-semibold leading-tight">{user.name}</p>
              <p className="text-xs capitalize text-slate-500">{user.roles.filter((r) => r !== "customer").join(", ").replace(/_/g, " ")}</p>
            </div>
            <button
              onClick={async () => {
                await api("/api/auth/logout", { body: {} });
                await auth.refresh();
                router.replace("/admin/login");
                router.refresh();
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
