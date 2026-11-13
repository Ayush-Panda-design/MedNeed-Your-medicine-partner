"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Appears after scrolling down a screen or two; one tap returns to the top. */
export function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const on = () => setShow(window.scrollY > 700);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  if (!show) return null;
  return (
    <button
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      className="mn-fab fixed bottom-5 right-5 z-50 grid h-11 w-11 place-items-center rounded-full bg-teal-700 text-white shadow-lg shadow-teal-900/20 hover:bg-teal-800"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
