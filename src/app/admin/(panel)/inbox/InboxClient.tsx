"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowLeft, CheckCircle2, Inbox, Loader2, Mail, Phone, RotateCcw, Search, Zap } from "lucide-react";
import { useLive } from "@/lib/live";
import { Bubbles } from "@/components/chat/Bubbles";
import { Composer } from "@/components/chat/Composer";
import { ago, newClientId } from "@/components/chat/format";
import type { Msg } from "@/components/chat/useStoreChat";

type Thread = { id: string; status: "open" | "closed"; customer: { id: string; name: string; phone: string | null; email: string | null }; unread: number; lastAt: string; preview: string; lastSender: string };
type Detail = Thread & { customerReadAt: string | null; staffReadAt: string | null };
type Filter = "open" | "unread" | "closed" | "all";

const QUICK = [
  "Yes, it's in stock. You can add it to your cart and order it right away.",
  "Sorry, that one is out of stock right now. We can arrange it within 1–2 days if you'd like.",
  "Please upload a clear photo of your prescription so our pharmacist can check it.",
  "Your order is on its way. You can track it from your account.",
  "Thank you for contacting MedNeed. Is there anything else we can help you with?",
];

const refHref = (r: { type: string; id: string }) => (r.type === "order" ? `/admin/orders/${r.id}` : `/admin/prescriptions/${r.id}`);

export function InboxClient() {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("t");
  const [filter, setFilter] = useState<Filter>("open");
  const [q, setQ] = useState("");
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [error, setError] = useState("");

  const loadList = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/chat/threads?filter=${filter}&q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setThreads(((await res.json()) as { items: Thread[] }).items);
      setError("");
    } catch {
      setError("Couldn't load conversations. Retrying…");
    }
  }, [filter, q]);

  useEffect(() => {
    const t = setTimeout(() => void loadList(), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [loadList, q]);
  useLive(["chat"], () => void loadList());

  const open = (id: string | null) => router.replace(id ? `/admin/inbox?t=${id}` : "/admin/inbox", { scroll: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Inbox</h1>
        <p className="mt-1 text-sm text-slate-500">Messages from customers. New messages appear here by themselves; no need to refresh.</p>
      </div>
      <div className="grid h-[calc(100dvh-13rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[22rem_1fr]">
        {/* List */}
        <section className={`${active ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r border-slate-200`}>
          <div className="space-y-2 border-b border-slate-200 p-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone or email" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500" />
            </label>
            <div className="flex gap-1 text-xs font-semibold">
              {(["open", "unread", "closed", "all"] as Filter[]).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 capitalize ${filter === f ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {f === "closed" ? "Resolved" : f}
                </button>
              ))}
            </div>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
            {threads === null ? (
              <li className="grid place-items-center p-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></li>
            ) : threads.length === 0 ? (
              <li className="p-8 text-center text-sm text-slate-500"><Inbox className="mx-auto mb-2 h-6 w-6 text-slate-300" />No conversations here.</li>
            ) : (
              threads.map((t) => (
                <li key={t.id}>
                  <button onClick={() => open(t.id)} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${active === t.id ? "bg-teal-50" : ""}`}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">{t.customer.name.slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-sm ${t.unread ? "font-bold" : "font-semibold"}`}>{t.customer.name}</span>
                        <span className="shrink-0 text-[11px] text-slate-400">{ago(t.lastAt)}</span>
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-xs ${t.unread ? "font-semibold text-slate-800" : "text-slate-500"}`}>{t.lastSender === "staff" ? "You: " : ""}{t.preview}</span>
                        {t.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-teal-600 px-1 text-[11px] font-bold text-white">{t.unread}</span>}
                      </span>
                      {t.status === "closed" && <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500">Resolved</span>}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          {error && <p className="border-t border-slate-200 p-2 text-center text-xs text-rose-600">{error}</p>}
        </section>

        {/* Conversation */}
        <section className={`${active ? "flex" : "hidden lg:flex"} min-h-0 flex-col`}>
          {active ? <Conversation key={active} id={active} onBack={() => open(null)} onChanged={loadList} /> : (
            <div className="grid flex-1 place-items-center p-8 text-center text-sm text-slate-500">
              <div><Inbox className="mx-auto mb-2 h-8 w-8 text-slate-300" />Pick a conversation to read and reply.</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Conversation({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) {
  const [thread, setThread] = useState<Detail | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [missing, setMissing] = useState(false);
  const [quick, setQuick] = useState(false);
  const [newBelow, setNewBelow] = useState(false);
  const lastId = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await fetch(`/api/admin/chat/threads/${id}?after=${lastId.current}`, { cache: "no-store" });
      if (res.status === 404) return setMissing(true);
      if (!res.ok) return;
      const data = (await res.json()) as { thread: Detail; messages: Msg[] };
      setThread(data.thread);
      if (data.messages.length) {
        lastId.current = Math.max(lastId.current, ...data.messages.map((m) => m.id));
        setMessages((cur) => {
          const have = new Set(cur.filter((m) => !m.state).map((m) => m.id));
          const incoming = data.messages.filter((m) => !have.has(m.id));
          const arrived = new Set(incoming.map((m) => m.clientId).filter(Boolean));
          const local = cur.filter((m) => m.state && !(m.clientId && arrived.has(m.clientId)));
          return [...cur.filter((m) => !m.state), ...incoming].sort((a, b) => a.id - b.id).concat(local);
        });
      }
      if (data.thread.unread > 0) {
        void fetch(`/api/admin/chat/threads/${id}/read`, { method: "POST" }).then(onChanged).catch(() => {});
      }
    } finally {
      busy.current = false;
    }
  }, [id, onChanged]);

  useEffect(() => {
    void load();
  }, [load]);
  useLive(["chat"], () => void load());

  const toBottom = (smooth = false) => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setNewBelow(false);
  };
  useEffect(() => {
    if (stick.current) toBottom();
    else if (messages.length) setNewBelow(true);
  }, [messages.length]);

  const post = async (clientId: string, body: string) => {
    try {
      const res = await fetch(`/api/admin/chat/threads/${id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, clientId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't send.");
      const real = data.message as Msg;
      lastId.current = Math.max(lastId.current, real.id);
      setMessages((cur) => {
        const rest = cur.filter((m) => m.clientId !== clientId && m.id !== real.id);
        return [...rest.filter((m) => !m.state), real].sort((a, b) => a.id - b.id).concat(rest.filter((m) => m.state));
      });
      setThread((t) => (t ? { ...t, status: "open" } : t));
      onChanged();
    } catch (e) {
      setMessages((cur) => cur.map((m) => (m.clientId === clientId && m.state ? { ...m, state: "failed", error: e instanceof Error ? e.message : "Couldn't send." } : m)));
    }
  };

  const send = (text: string) => {
    const clientId = newClientId();
    stick.current = true;
    setMessages((cur) => [...cur, { id: -Date.now(), role: "staff", body: text, at: new Date().toISOString(), ref: null, clientId, senderName: null, state: "sending" }]);
    void post(clientId, text);
  };
  const retry = (clientId: string) => {
    const m = messages.find((x) => x.clientId === clientId);
    if (!m) return;
    setMessages((cur) => cur.map((x) => (x.clientId === clientId ? { ...x, state: "sending", error: undefined } : x)));
    void post(clientId, m.body);
  };

  const setStatus = async (status: "open" | "closed") => {
    setThread((t) => (t ? { ...t, status } : t));
    await fetch(`/api/admin/chat/threads/${id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    onChanged();
  };

  if (missing) return <div className="grid flex-1 place-items-center p-8 text-sm text-slate-500">That conversation no longer exists.</div>;
  if (!thread) return <div className="grid flex-1 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>;

  return (
    <>
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <button onClick={onBack} aria-label="Back to conversations" className="rounded-lg p-1.5 hover:bg-slate-100 lg:hidden"><ArrowLeft className="h-5 w-5" /></button>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">{thread.customer.name.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{thread.customer.name}</p>
          <p className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
            {thread.customer.phone && <a href={`tel:${thread.customer.phone}`} className="inline-flex items-center gap-1 hover:text-teal-700"><Phone className="h-3 w-3" />{thread.customer.phone}</a>}
            {thread.customer.email && <a href={`mailto:${thread.customer.email}`} className="inline-flex max-w-[12rem] items-center gap-1 truncate hover:text-teal-700"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{thread.customer.email}</span></a>}
          </p>
        </div>
        {thread.status === "open" ? (
          <button onClick={() => setStatus("closed")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Mark resolved</button>
        ) : (
          <button onClick={() => setStatus("open")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"><RotateCcw className="h-4 w-4" /> Reopen</button>
        )}
      </header>

      <div className="relative min-h-0 flex-1 bg-slate-50">
        <div
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            if (stick.current) setNewBelow(false);
          }}
          className="h-full overflow-y-auto p-4"
        >
          <Bubbles
            messages={messages}
            mine="staff"
            seenAt={thread.customerReadAt}
            onRetry={retry}
            theirLabel={thread.customer.name.split(" ")[0]}
            refHref={refHref}
          />
        </div>
        {newBelow && (
          <button onClick={() => toBottom(true)} className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg"><ArrowDown className="h-3.5 w-3.5" /> New messages</button>
        )}
      </div>

      <div className="relative">
        {quick && (
          <div className="absolute inset-x-3 bottom-full z-10 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            {QUICK.map((t) => (
              <button key={t} onClick={() => { send(t); setQuick(false); }} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-xs text-slate-700 last:border-0 hover:bg-teal-50">{t}</button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-3 pt-2">
          <button onClick={() => setQuick((v) => !v)} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200"><Zap className="h-3 w-3" /> Quick replies</button>
          <Link href={`/admin/users`} className="text-[11px] text-slate-400 hover:text-teal-700">Customer records</Link>
        </div>
        <Composer onSend={send} placeholder={`Reply to ${thread.customer.name.split(" ")[0]}...`} autoFocus />
      </div>
    </>
  );
}
