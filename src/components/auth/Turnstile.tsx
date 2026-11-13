"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi; __mnTurnstileLoad?: Promise<void> }
}

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  window.__mnTurnstileLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile load failed"));
    document.head.appendChild(s);
  });
  return window.__mnTurnstileLoad;
}

/**
 * Cloudflare Turnstile bot check. Usually invisible ("interaction-only"); it shows a checkbox only when Cloudflare is unsure.
 * Returns the current token and a reset() to call after each use (tokens are single-use).
 * With no site key it renders nothing and the token is always "" (the server does not ask for one either).
 */
export function useTurnstile(siteKey: string | null) {
  const ref = useRef<HTMLDivElement | null>(null);
  const id = useRef<string | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        id.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          appearance: "interaction-only",
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (id.current) window.turnstile?.remove(id.current);
      id.current = null;
    };
  }, [siteKey]);

  const reset = useCallback(() => {
    setToken("");
    if (id.current) window.turnstile?.reset(id.current);
  }, []);

  const widget = siteKey ? <div ref={ref} className="mt-3 flex justify-center empty:mt-0" /> : null;
  return { token, reset, widget, enabled: Boolean(siteKey) };
}
