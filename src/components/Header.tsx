"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, Package, Search, ShoppingCart, Truck, Upload, User, UserCircle, X } from "lucide-react";
import { displayName } from "@/lib/api";
import type { Category } from "@/lib/catalog";
import { useAuth, useCart } from "@/lib/providers";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "./Logo";
import { SearchBox } from "./SearchBox";
import { CategoryMenu } from "./CategoryMenu";
import { PincodePicker } from "./PincodePicker";

export function Header({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const cart = useCart();
  const auth = useAuth();
  const [menu, setMenu] = useState(false);
  const isHome = pathname === "/";
  // On the homepage the header floats transparently over the cinematic hero and turns solid once scrolled past it.
  // Starts solid: the current homepage hero is light, so a white floating header would flash unreadable on first paint.
  const [overHero, setOverHero] = useState(false);
  // The header only floats over the page when a full-bleed cinematic hero (#mn-cine) is present.
  const [floatOverHero, setFloatOverHero] = useState(false);
  // Scrolled down: the whole header condenses into a floating pill.
  const [compact, setCompact] = useState(false);
  // Phones, compact pill: the search field opens on demand inside the pill.
  const [searchOpen, setSearchOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [spacer, setSpacer] = useState<number | null>(null);

  useEffect(() => {
    let raf = 0;
    // The hero is looked up on every update, not once: the page can stream in after the header mounts (the loading skeleton shows first),
    // and a header that missed the hero would stay in its plain "not on the homepage" look.
    const update = () => {
      raf = 0;
      const hero = isHome ? document.getElementById("mn-cine") : null;
      setFloatOverHero(Boolean(hero));
      const y = window.scrollY;
      const over = hero ? hero.getBoundingClientRect().bottom > 120 : false;
      setOverHero(over);
      // hysteresis so the header never flickers at the threshold
      setCompact((c) => (hero ? !over : c ? y > 40 : y > 140));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Re-check when page content is added or swapped (streaming, navigation). Only on the homepage, and only structural changes.
    const mo = isHome ? new MutationObserver(onScroll) : null;
    mo?.observe(document.body, { childList: true, subtree: true });
    return () => { mo?.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [isHome]);

  useEffect(() => { if (!compact) setSearchOpen(false); }, [compact]);

  // Off the homepage the header is fixed too (so condensing never shifts the page); a spacer keeps its full height.
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el || compact) return;
    const measure = () => setSpacer(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact, auth.user]);

  const overlay = overHero && !compact;
  const cls = {
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
  const solid = !overlay && !compact;

  return (
    <>
      <header
        ref={headerRef}
        data-compact={compact || undefined}
        className={`mn-hdr fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,color] duration-300 ${overlay ? "text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]" : "text-slate-900"} ${solid ? "bg-white/85 shadow-sm shadow-slate-900/5 backdrop-blur-md" : ""}`}
      >
        {overlay && <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/30 to-transparent" />}

        <div className="mn-collapse" data-open={solid}>
          <div>
            <div className="bg-teal-700 text-teal-50">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs sm:px-6">
                <p className="truncate">Free delivery on orders above ₹499 · Genuine medicines, verified by pharmacists</p>
                <p className="hidden shrink-0 sm:block">Need help? Support 8am–10pm</p>
              </div>
            </div>
          </div>
        </div>

        {/* The bar itself: full width at the top, a floating pill once scrolled. */}
        <div className="mn-hdr-shell">
          <div className={`mx-auto flex max-w-7xl flex-wrap items-center gap-x-[6px] gap-y-[10px] transition-[padding] duration-500 sm:gap-x-4 lg:flex-nowrap lg:gap-x-6 ${compact ? "px-2.5 py-1.5 sm:px-3 lg:px-3 lg:py-1.5" : "px-[12px] py-[10px] sm:px-6 sm:py-3 lg:py-2.5"}`}>
            <span className="mn-hdr-logo"><Logo light={overlay} size="nav" /></span>

            <div className={compact ? "hidden" : "lg:hidden"}>
              <CategoryMenu categories={categories} overlay={overlay} />
            </div>

            {/* search: full row on phones, inline on desktop; inside the phone pill it opens on demand */}
            <div className={`order-last min-w-0 basis-full lg:order-none lg:mx-auto lg:max-w-2xl lg:flex-1 lg:basis-0 ${compact && !searchOpen ? "max-lg:hidden" : ""} ${compact ? "mn-hdr-search" : ""}`}>
              <SearchBox overlay={overlay} styles={{ box: cls.searchBox, icon: cls.searchIcon, input: cls.searchInput }} />
            </div>

            <div className="ml-auto flex items-center gap-[2px] sm:gap-2 md:ml-0">
              {compact && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen((o) => !o);
                    requestAnimationFrame(() => headerRef.current?.querySelector<HTMLInputElement>(".mn-hdr-search input")?.focus());
                  }}
                  aria-label={searchOpen ? "Close search" : "Search"}
                  aria-expanded={searchOpen}
                  className={`grid h-[36px] w-[36px] place-items-center rounded-full lg:hidden ${cls.ghost}`}
                >
                  {searchOpen ? <X className="h-[19px] w-[19px]" /> : <Search className="h-[19px] w-[19px]" />}
                </button>
              )}

              <Link href="/account/prescriptions/new" aria-label="Upload prescription" className={`hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold lg:flex ${cls.uploadRx} ${compact ? "rounded-full px-2.5" : ""}`}>
                <Upload className="h-4 w-4" /> <span className={compact ? "hidden xl:inline" : ""}>Upload Rx</span>
              </Link>

          {auth.user ? (
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu" className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium sm:px-3 ${cls.ghost}`}>
                <User className="h-5 w-5" />
                <span className={`max-w-[10rem] truncate ${compact ? "hidden" : "hidden sm:inline"}`}>{displayName(auth.user)}</span>
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
              <span className={compact ? "hidden" : "hidden sm:inline"}>Sign in</span>
            </Link>
          )}

          <ThemeToggle className={`${cls.ghost} max-sm:h-[36px] max-sm:w-[36px] max-[359px]:hidden ${compact ? "rounded-full" : ""}`} />

              <Link href="/cart" aria-label="Cart" className={`relative ml-[4px] flex h-[36px] items-center gap-2 rounded-lg px-[10px] text-sm font-semibold sm:ml-0 sm:h-auto sm:px-4 sm:py-2 ${cls.cart} ${compact ? "!rounded-full sm:!px-3" : ""}`}>
                <ShoppingCart className="h-[20px] w-[20px]" />
                <span className={compact ? "hidden" : "hidden sm:inline"}>Cart</span>
                {cart.count > 0 && (
                  <span key={cart.count} className="mn-cartpop absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-xs font-bold text-amber-950">
                    {cart.count}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Row 2 (desktop): categories and delivery check; folds away in the pill */}
          <div className="mn-collapse max-lg:!hidden" data-open={!compact}>
            <div>
              <div className={`border-t ${overlay ? "border-white/15" : "border-slate-200/80"}`}>
                <div className="mx-auto flex h-11 max-w-7xl items-center gap-2 px-6 text-[13px]">
                  <CategoryMenu categories={categories} overlay={overlay} />
                  <span aria-hidden className={`h-5 w-px ${overlay ? "bg-white/25" : "bg-slate-200"}`} />
                  <PincodePicker overlay={overlay} />
                </div>
              </div>
            </div>
          </div>

          <div aria-hidden className="mn-progress" />
        </div>

        {solid && <div aria-hidden className="h-[2px] bg-gradient-to-r from-teal-600 via-lime-400 to-emerald-500" />}
      </header>
      {/* keeps the page content below the fixed header (the homepage hero sits under it on purpose) */}
      {!floatOverHero && <div aria-hidden className="mn-hdr-spacer" style={spacer ? { height: spacer } : undefined} />}
    </>
  );
}
