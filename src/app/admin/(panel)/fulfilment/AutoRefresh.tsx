"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Keeps a queue page current while it is open, without losing what the person is doing. */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      // Do not refresh while someone is typing or has just ticked something.
      const el = document.activeElement;
      if (el && ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return;
      router.refresh();
    };
    const t = setInterval(tick, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
