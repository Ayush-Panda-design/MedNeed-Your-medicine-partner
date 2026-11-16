"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLive } from "@/lib/live";
import { newClientId } from "./format";

export type Ref = { type: "order" | "prescription"; id: string; label: string };
export type Msg = {
  id: number;
  role: "customer" | "staff" | "system";
  body: string;
  at: string;
  ref: Ref | null;
  clientId: string | null;
  senderName: string | null;
  /** Local only: being sent, or failed to send. */
  state?: "sending" | "failed";
  error?: string;
};

type Payload = { messages: Msg[]; unread: number; status: string; staffReadAt: string | null };

/**
 * The customer's conversation with the store team: loads it, keeps it live, sends messages with instant (optimistic) display,
 * and keeps the unread count. Does nothing until `enabled` (signed in).
 */
export function useStoreChat(enabled: boolean, open: boolean) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [unread, setUnread] = useState(0);
  const [staffReadAt, setStaffReadAt] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const lastId = useRef(0);
  const inflight = useRef(false);
  const again = useRef(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    if (inflight.current) {
      again.current = true;
      return;
    }
    inflight.current = true;
    try {
      const res = await fetch(`/api/chat?after=${lastId.current}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as Payload;
      setLoadError(false);
      setUnread(data.unread);
      setStaffReadAt(data.staffReadAt);
      setClosed(data.status === "closed");
      if (data.messages.length) {
        lastId.current = Math.max(lastId.current, ...data.messages.map((m) => m.id));
        setMessages((cur) => {
          const have = new Set(cur.filter((m) => !m.state).map((m) => m.id));
          const incoming = data.messages.filter((m) => !have.has(m.id));
          const sent = new Set(incoming.map((m) => m.clientId).filter(Boolean));
          // A message we were still showing as "sending" has now arrived from the server: drop the local copy.
          const kept = cur.filter((m) => !(m.state === "sending" && m.clientId && sent.has(m.clientId)));
          const server = [...kept.filter((m) => !m.state), ...incoming].sort((a, b) => a.id - b.id);
          return [...server, ...kept.filter((m) => m.state)];
        });
      }
      setLoaded(true);
    } catch {
      setLoadError(true);
      setLoaded(true);
    } finally {
      inflight.current = false;
      if (again.current) {
        again.current = false;
        void load();
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setMessages([]);
      setUnread(0);
      setLoaded(false);
      lastId.current = 0;
      return;
    }
    void load();
  }, [enabled, load]);

  useLive(enabled ? ["chat"] : ["__none__"], () => void load());

  // Opening the chat counts as reading it.
  useEffect(() => {
    if (!enabled || !open || unread === 0) return;
    setUnread(0);
    void fetch("/api/chat/read", { method: "POST" }).catch(() => {});
  }, [enabled, open, unread, messages.length]);

  const post = useCallback(
    async (clientId: string, body: string, ref: Ref | null) => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, clientId, ref: ref ? { type: ref.type, id: ref.id } : null }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessages((cur) => cur.map((m) => (m.clientId === clientId && m.state ? { ...m, state: "failed", error: data.error ?? "Couldn't send. Tap to try again." } : m)));
          return;
        }
        const real = data.message as Msg;
        lastId.current = Math.max(lastId.current, real.id);
        setClosed(false);
        setMessages((cur) => {
          const rest = cur.filter((m) => m.clientId !== clientId && m.id !== real.id);
          const server = [...rest.filter((m) => !m.state), real].sort((a, b) => a.id - b.id);
          return [...server, ...rest.filter((m) => m.state)];
        });
      } catch {
        setMessages((cur) => cur.map((m) => (m.clientId === clientId && m.state ? { ...m, state: "failed", error: "No connection. Tap to try again." } : m)));
      }
    },
    [],
  );

  const send = useCallback(
    (body: string, ref: Ref | null) => {
      const text = body.trim();
      if (!text) return;
      const clientId = newClientId();
      setMessages((cur) => [...cur, { id: -Date.now(), role: "customer", body: text, at: new Date().toISOString(), ref, clientId, senderName: null, state: "sending" }]);
      void post(clientId, text, ref);
    },
    [post],
  );

  const retry = useCallback(
    (clientId: string) => {
      const m = messages.find((x) => x.clientId === clientId);
      if (!m) return;
      setMessages((cur) => cur.map((x) => (x.clientId === clientId ? { ...x, state: "sending", error: undefined } : x)));
      void post(clientId, m.body, m.ref);
    },
    [messages, post],
  );

  return { messages, unread, staffReadAt, closed, loaded, loadError, send, retry, reload: load };
}
