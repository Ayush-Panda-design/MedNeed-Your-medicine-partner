"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, MapPin, Package, Search, ShoppingCart, Upload, User, UserCircle } from "lucide-react";
import { displayName } from "@/lib/api";
import { categories } from "@/lib/data";
import { useAuth, useCart } from "@/lib/providers";
import { Logo } from "./Logo";

export function Header() {
  const router = useRouter();
  const cart = useCart();
  const auth = useAuth();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/medicines?q=${encodeURIComponent(term)}` : "/medicines");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="bg-teal-700 text-teal-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs sm:px-6">
          <p className="truncate">Free delivery on orders above ₹499 · Genuine medicines, verified by pharmacists</p>
          <p className="hidden shrink-0 sm:block">Need help? Support 8am–10pm</p>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <Logo />

        <button className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-teal-600 lg:flex" aria-label="Choose delivery location">
          <MapPin className="h-4 w-4 text-teal-600" />
          <span>
            <span className="block text-[11px] leading-none text-slate-500">Deliver to</span>
            <span className="block font-semibold leading-tight">Select pincode</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        <form onSubmit={onSearch} role="search" className="order-last flex w-full flex-1 md:order-none md:w-auto">
          <label htmlFor="site-search" className="sr-only">Search medicines</label>
          <div className="flex w-full items-center rounded-xl border border-slate-300 bg-slate-50 focus-within:border-teal-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-100">
            <Search className="ml-3 h-5 w-5 text-slate-400" />
            <input
              id="site-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for medicines, health products and more"
              className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-slate-400"
            />
            <button type="submit" className="m-1 rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-700">
              Search
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link href="/medicines" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 xl:flex">
            <Upload className="h-4 w-4" /> Upload Rx
          </Link>

          {auth.user ? (
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100">
                <User className="h-5 w-5" />
                <span className="hidden max-w-[10rem] truncate sm:inline">{displayName(auth.user)}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {menu && (
                <>
                  <button aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} />
                  <div role="menu" className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg">
                    <Link role="menuitem" href="/account" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50"><UserCircle className="h-4 w-4" /> My account</Link>
                    <Link role="menuitem" href="/account/addresses" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50"><Package className="h-4 w-4" /> Saved addresses</Link>
                    {auth.user.isStaff && (
                      <Link role="menuitem" href="/admin" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50"><LayoutDashboard className="h-4 w-4" /> Admin panel</Link>
                    )}
                    <button
                      role="menuitem"
                      onClick={async () => {
                        setMenu(false);
                        await auth.signOut();
                        router.push("/");
                        router.refresh();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/login" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-slate-100">
              <User className="h-5 w-5" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}

          <Link href="/cart" className="relative flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden sm:inline">Cart</span>
            {cart.count > 0 && (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-xs font-bold text-amber-950">
                {cart.count}
              </span>
            )}
          </Link>
        </div>
      </div>

      <nav aria-label="Categories" className="border-t border-slate-100">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-1.5 text-sm sm:px-6">
          <li>
            <Link href="/medicines" className="block whitespace-nowrap rounded-md px-3 py-1.5 font-semibold text-teal-700 hover:bg-teal-50">
              All medicines
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/medicines?category=${c.slug}`}
                className="block whitespace-nowrap rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
