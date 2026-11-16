"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/providers";

/*
 * Live updates for signed-in people. One connection per browser tab (server-sent events), shared by everything on the page.
 * The server only sends small "something changed" signals; components then fetch what they need through the normal API.
 *
 *  - The connection pauses while the tab is hidden and resumes (with a catch-up) when it is shown again.
 *  - If the network blocks event streams, it falls back to asking for signals every few seconds.
 *  - Every (re)connect sends a "resync" signal so components can catch up on anything they missed meanwhile.
 */

export type Signal = { topic: string; [k: string]: unknown };
type Listener = (s: Signal) => void;
export type LiveState = "off" | "connecting" | "live" | "polling";

type Ctx = { state: LiveState; subscribe: (fn: Listener) => () => void };
const LiveContext = createContext<Ctx>({ state: "off", subscribe: () => () => {} });

const POLL_MS = 4000;

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<LiveState>("off");
  const listeners = useRef(new Set<Listener>());

  const api = useMemo<Ctx>(
    () => ({
      state,
      subscribe: (fn) => {
        listeners.current.add(fn);
        return () => {
          listeners.current.delete(fn);
        };
      },
    }),
    [state],
  );

  useEffect(() => {
    if (!userId || typeof window === "undefined") {
      setState("off");
      return;
    }
    const emit = (s: Signal) => listeners.current.forEach((fn) => { try { fn(s); } catch { /* one listener must not break the others */ } });
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let cursor = 0;
    let failures = 0;
    let stopped = false;
    let usePolling = false;
    // True when signals may have been missed (first connect, a dropped connection, a hidden tab): components then re-read their data.
    let needResync = true;
    let idle = false;

    const stopAll = () => {
      es?.close();
      es = null;
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = null;
    };

    const poll = async () => {
      if (stopped || document.hidden || idle) return;
      try {
        const res = await fetch(`/api/live/poll?after=${cursor}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { events: { id: number; topic: string; payload: Record<string, unknown> }[]; cursor: number };
          const first = cursor === 0;
          cursor = data.cursor || cursor;
          if (first || needResync) emit({ topic: "resync" });
          needResync = false;
          for (const e of data.events) emit({ topic: e.topic, ...e.payload });
          setState("polling");
        }
      } catch {
        /* try again on the next round */
      }
      pollTimer = setTimeout(poll, POLL_MS);
    };

    const connect = () => {
      if (stopped || document.hidden) return;
      stopAll();
      if (usePolling || typeof EventSource === "undefined") {
        void poll();
        return;
      }
      setState("connecting");
      const source = new EventSource(cursor > 0 ? `/api/live/stream?after=${cursor}` : "/api/live/stream");
      es = source;
      source.addEventListener("hello", (ev) => {
        failures = 0;
        try {
          const d = JSON.parse((ev as MessageEvent).data) as { cursor: number };
          if (!cursor) cursor = d.cursor;
        } catch { /* ignore */ }
        setState("live");
        if (needResync) {
          needResync = false;
          emit({ topic: "resync" });
        }
      });
      source.addEventListener("signal", (ev) => {
        const m = ev as MessageEvent;
        if (m.lastEventId) cursor = Number(m.lastEventId) || cursor;
        try { emit(JSON.parse(m.data) as Signal); } catch { /* ignore a malformed signal */ }
      });
      source.onerror = () => {
        // The server ends each connection after under a minute and the browser reconnects by itself; that is normal.
        // Only a connection that never opens counts as a failure.
        if (source.readyState === EventSource.CLOSED || source.readyState === EventSource.CONNECTING) {
          failures += 1;
          if (failures > 1) needResync = true;
          if (failures >= 4) {
            usePolling = true;
            connect();
          } else if (source.readyState === EventSource.CLOSED) {
            setTimeout(connect, 1500 * failures);
          }
        }
      };
    };

    // Someone who has walked away from an open tab does not need a live connection (it would keep the database awake).
    // After 10 minutes without any interaction the connection pauses; the next touch or key press resumes it.
    let lastActive = Date.now();
    const touch = () => {
      lastActive = Date.now();
      if (idle) {
        idle = false;
        needResync = true;
        connect();
      }
    };
    const idleTimer = setInterval(() => {
      if (!idle && Date.now() - lastActive > 10 * 60_000) {
        idle = true;
        stopAll();
        setState("off");
      }
    }, 30_000);
    const activity = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    activity.forEach((n) => window.addEventListener(n, touch, { passive: true }));

    const onVisibility = () => {
      if (document.hidden) {
        stopAll();
        setState("off");
      } else if (!idle) {
        needResync = true;
        connect();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onOnline = () => {
      if (idle) return;
      needResync = true;
      connect();
    };
    window.addEventListener("online", onOnline);
    connect();
    return () => {
      stopped = true;
      clearInterval(idleTimer);
      activity.forEach((n) => window.removeEventListener(n, touch));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      stopAll();
      setState("off");
    };
  }, [userId]);

  return <LiveContext.Provider value={api}>{children}</LiveContext.Provider>;
}

export const useLiveState = () => useContext(LiveContext).state;

/** Run `fn` for signals on these topics, and once on every (re)connect ("resync"). `topics` empty = every signal. */
export function useLive(topics: string[], fn: (s: Signal) => void) {
  const { subscribe } = useContext(LiveContext);
  const ref = useRef(fn);
  ref.current = fn;
  const key = topics.join("|");
  useEffect(() => {
    const set = new Set(key ? key.split("|") : []);
    return subscribe((s) => {
      if (s.topic === "resync" || set.size === 0 || set.has(s.topic)) ref.current(s);
    });
  }, [subscribe, key]);
}

/** Refresh the current server-rendered page when any of these topics fire (for example an order's status page). */
export function LiveRefresh({ topics, match }: { topics: string[]; match?: { key: string; value: string } }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  useLive(topics, (s) => {
    if (s.topic === "resync") {
      // The first resync is just the connection opening; later ones mean we may have missed something.
      if (first.current) {
        first.current = false;
        return;
      }
    } else if (match && s[match.key] !== match.value) {
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => router.refresh(), 400);
  });
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return null;
}
