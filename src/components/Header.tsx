"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, MapPin, Package, ShoppingCart, Truck, Upload, User, UserCircle } from "lucide-react";
import { displayName } from "@/lib/api";
import type { Category } from "@/lib/catalog";
import { useAuth, useCart } from "@/lib/providers";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "./Logo";
import { SearchBox } from "./SearchBox";
import { CategoryMenu } from "./CategoryMenu";

export function Header({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const cart = useCart();
  const auth = useAuth();
  const [menu, setMenu] = useState(false);
  const isHome = pathname === "/";
  // On the homepage the header floats transparently over the cinematic hero and turns solid once scrolled past it.
  const [overHero, setOverHero] = useState(isHome);
  // The header only floats over the page when a full-bleed cinematic hero (#mn-cine) is present; otherwise it is a
  // normal sticky bar so it never covers the page content.
  const [floatOverHero, setFloatOverHero] = useState(isHome);

  useEffect(() => {
    if (!isHome) { setOverHero(false); setFloatOverHero(false); return; }
    const hero = document.getElementById("mn-cine");
    setFloatOverHero(Boolean(hero));
    if (!hero) { setOverHero(false); return; }
    const onScroll = () => setOverHero(hero.getBoundingClientRect().bottom > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [isHome]);

  const overlay = overHero;
  const cls = {
    header: `${isHome && floatOverHero ? "fixed" : "sticky"} top-0 z-40 w-full transition-colors duration-300 ${overlay ? "text-white" : "bg-white/85 text-slate-900 shadow-sm shadow-slate-900/5 backdrop-blur-md"}`,
    pincode: overlay
      ? "border-white/40 text-white hover:border-white"
      : "border-slate-200 hover:border-teal-600",
    searchBox: overlay
      ? "border-white/40 bg-white/15 backdrop-blur focus-within:border-white focus-within:bg-white/25"
      : "border-slate-300 bg-slate-50 focus-within:border-teal-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-100",
    searchIcon: overlay ? "text-white/70" : "text-slate-400",
    searchInput: overlay ? "text-white placeholder:text-white/70" : "placeholder:text-slate-400",
    ghost: overlay ? "text-white hover:bg-white/10" : "hover:bg-slate-100",
    uploadRx: overlay ? "text-white hover:bg-white/10" : "text-teal-700 hover:bg-teal-50",
    cart: overlay ? "bg-white text-slate-900 hover:bg-white/90" : "bg-slate-900 text-white hover:bg-slate-800",
    chevron: overlay ? "text-white/70" : "text-slate-400",
  };

  return (
    <header className={`${cls.header} ${overlay ? "[text-shadow:0_1px_2px_rgb(0_0_0/0.4)]" : ""}`}>
      {overlay && <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/30 to-transparent" />}

      {!overlay && (
        <div className="bg-teal-700 text-teal-50">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs sm:px-6">
            <p className="truncate">Free delivery on orders above ₹499 · Genuine medicines, verified by pharmacists</p>
            <p className="hidden shrink-0 sm:block">Need help? Support 8am–10pm</p>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-[6px] gap-y-[10px] px-[12px] py-[10px] sm:gap-x-4 sm:px-6 sm:py-3">
        <Logo light={overlay} size="nav" />

        <CategoryMenu categories={categories} overlay={overlay} />

        <button data-fx="pulse" className={`mn-fx-pulse hidden items-center gap-1.5 rounded-lg border px-3 py-2 text-left text-sm lg:flex ${cls.pincode}`} aria-label="Choose delivery location">
          <MapPin className={`h-4 w-4 ${overlay ? "text-lime-300" : "text-teal-600"}`} />
          <span>
            <span className={`block text-[11px] leading-none ${overlay ? "text-white/70" : "text-slate-500"}`}>Deliver to</span>
            <span className="block font-semibold leading-tight">Select pincode</span>
          </span>
          <ChevronDown className={`h-4 w-4 ${cls.chevron}`} />
        </button>

        <div className="order-last min-w-0 basis-full lg:order-none lg:flex-1 lg:basis-0">
          <SearchBox overlay={overlay} styles={{ box: cls.searchBox, icon: cls.searchIcon, input: cls.searchInput }} />
        </div>

        <div className="ml-auto flex items-center gap-[2px] sm:gap-2 md:ml-0">
          <Link href="/account/prescriptions/new" className={`hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold xl:flex ${cls.uploadRx}`}>
            <Upload className="h-4 w-4" /> Upload Rx
          </Link>

          {auth.user ? (
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu" className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium sm:px-3 ${cls.ghost}`}>
                <User className="h-5 w-5" />
                <span className="hidden max-w-[10rem] truncate sm:inline">{displayName(auth.user)}</span>
                <ChevronDown className={`h-4 w-4 ${cls.chevron}`} />
              </button>
              {menu && (
                <>
                  <button aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} />
                  <div role="menu" className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 text-sm text-slate-900 shadow-lg">
                    <Link role="menuitem" href="/account" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50"><UserCircle className="h-4 w-4" /> My account</Link>
                    <Link role="menuitem" href="/account/addresses" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50"><Package className="h-4 w-4" /> Saved addresses</Link>
                    {auth.user.isDelivery && (
                      <Link role="menuitem" href="/delivery" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50"><Truck className="h-4 w-4" /> My deliveries</Link>
                    )}
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
            <Link href="/login" aria-label="Sign in" className={`flex h-[36px] items-center gap-2 rounded-lg px-[8px] text-sm font-semibold sm:h-auto sm:px-3 sm:py-2 ${cls.ghost}`}>
              <User className="h-[20px] w-[20px]" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}

          <ThemeToggle className={`${cls.ghost} max-sm:h-[36px] max-sm:w-[36px] max-[359px]:hidden`} />

          <Link href="/cart" aria-label="Cart" className={`relative ml-[4px] flex h-[36px] items-center gap-2 rounded-lg px-[10px] text-sm font-semibold sm:ml-0 sm:h-auto sm:px-4 sm:py-2 ${cls.cart}`}>
            <ShoppingCart className="h-[20px] w-[20px]" />
            <span className="hidden sm:inline">Cart</span>
            {cart.count > 0 && (
              <span key={cart.count} className="mn-cartpop absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-xs font-bold text-amber-950">
                {cart.count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {!overlay && <div aria-hidden className="h-[2px] bg-gradient-to-r from-teal-600 via-lime-400 to-emerald-500" />}
      <div aria-hidden className="mn-progress" />
    </header>
  );
}
