"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, FileText, MapPin, Package, UserCircle } from "lucide-react";

const items = [
  { href: "/account", label: "Profile & security", icon: UserCircle },
  { href: "/account/orders", label: "My orders", icon: Package },
  { href: "/account/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/account/reminders", label: "Refill reminders", icon: BellRing },
  { href: "/account/addresses", label: "Saved addresses", icon: MapPin },
];

export function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="flex gap-2 overflow-x-auto md:flex-col">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={path === href || (href !== "/account" && path.startsWith(href)) ? "page" : undefined}
          className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium ${path === href || (href !== "/account" && path.startsWith(href)) ? "bg-teal-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}
        >
          <Icon className="h-4 w-4" /> {label}
        </Link>
      ))}
    </nav>
  );
}
