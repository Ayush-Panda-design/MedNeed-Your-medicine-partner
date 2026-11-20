"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";

const KEY = "medneed_theme";
// The theme applies to the storefront and sign-in pages only; staff and delivery screens keep their own look.
const unthemed = (path: string) => path.startsWith("/admin") || path.startsWith("/delivery");

function wantsDark(): boolean {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved === "dark";
  } catch { /* storage unavailable: fall back to the system setting */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function apply(path: string) {
  const root = document.documentElement;
  const on = !unthemed(path);
  root.classList.toggle("theme", on);
  root.classList.toggle("dark", on && wantsDark());
}

/** Runs before first paint (inlined in the root layout) so the page never flashes the wrong theme. */
export const themeScript = `(function(){try{var p=location.pathname;if(p.indexOf("/admin")===0||p.indexOf("/delivery")===0)return;var r=document.documentElement,s=null;try{s=localStorage.getItem("${KEY}")}catch(e){}var d=s==="dark"||(s!=="light"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches);r.classList.add("theme");if(d)r.classList.add("dark")}catch(e){}})();`;

/** Keeps the theme classes right as the visitor moves between pages, and follows the system setting until they choose. */
export function ThemeSync() {
  const pathname = usePathname() ?? "/";
  useEffect(() => {
    apply(pathname);
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const on = () => apply(pathname);
    mq?.addEventListener?.("change", on);
    window.addEventListener("storage", on);
    return () => { mq?.removeEventListener?.("change", on); window.removeEventListener("storage", on); };
  }, [pathname]);
  return null;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    try { window.localStorage.setItem(KEY, next); } catch { /* still switches for this page view */ }
    const flip = () => {
      root.classList.add("theme");
      root.classList.toggle("dark", next === "dark");
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } };
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduce) { flip(); return; }

    // One whole-page snapshot cross-reveal: the new theme grows as a circle from the button,
    // so every element changes together instead of piece by piece.
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add("theme-vt");
    const t = doc.startViewTransition(flip);
    t.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(.4,0,.2,1)", pseudoElement: "::view-transition-new(root)" },
      );
    }).catch(() => {});
    t.finished.finally(() => root.classList.remove("theme-vt"));
  };
  return (
    <button type="button" onClick={toggle} aria-label="Switch between light and dark theme" title="Light / dark theme" className={`grid h-10 w-10 place-items-center rounded-lg ${className}`}>
      <Moon className="h-[20px] w-[20px] dark:hidden" />
      <Sun className="hidden h-[20px] w-[20px] dark:block" />
    </button>
  );
}
