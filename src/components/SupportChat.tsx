"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles, UserRound } from "lucide-react";
import { Lantern, Petals, Scene, ToriiIcon } from "@/components/chat/JpArt";
import { useAuth } from "@/lib/providers";
import { useLiveState } from "@/lib/live";
import { StoreChatView } from "@/components/chat/StoreChatView";
import { useStoreChat, type Ref } from "@/components/chat/useStoreChat";

type Turn = { role: "user" | "assistant"; text: string };
type Mode = "ai" | "store";

const GREETING: Turn = {
  role: "assistant",
  text: "こんにちは! I'm the MedNeed assistant. Ask me about orders, delivery, payments, prescriptions or how the store works. For anything medical, please consult a doctor or our pharmacist.",
};

const SUGGESTIONS = ["What are your delivery charges?", "Do I need a prescription?", "Where is my order?", "What are your timings?"];

/** Open the chat from anywhere: window.dispatchEvent(new CustomEvent("medneed:open-chat", { detail: { mode: "store", ref } })) */
export type OpenChatDetail = { mode?: Mode; ref?: Ref | null };

export function SupportChat({ aiEnabled = true }: { aiEnabled?: boolean }) {
  const { user, ready } = useAuth();
  const live = useLiveState();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(aiEnabled ? "ai" : "store");
  const [pendingRef, setPendingRef] = useState<Ref | null>(null);
  const chat = useStoreChat(Boolean(user), open && mode === "store");

  // Other parts of the site can open the chat, optionally on the store-team tab with an order or prescription attached.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = ((e as CustomEvent).detail ?? {}) as OpenChatDetail;
      setOpen(true);
      if (d.mode) setMode(d.mode === "ai" && !aiEnabled ? "store" : d.mode);
      if (d.ref) setPendingRef(d.ref);
    };
    window.addEventListener("medneed:open-chat", onOpen);
    return () => window.removeEventListener("medneed:open-chat", onOpen);
  }, [aiEnabled]);

  // Lets the stylesheet keep the scroll-to-top button clear of the chat button and panel.
  useEffect(() => {
    document.body.classList.add("mn-has-chat");
    return () => document.body.classList.remove("mn-has-chat", "mn-chat-open");
  }, []);
  useEffect(() => {
    document.body.classList.toggle("mn-chat-open", open);
  }, [open]);

  const unread = open && mode === "store" ? 0 : chat.unread;
  const path = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : unread ? `Chat with us (${unread} new)` : "Chat with us"}
        className="mn-chat-fab fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-teal-600 to-lime-500 text-white shadow-lg shadow-teal-900/25 transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-white dark:ring-slate-900">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {/* Veil: dims and softly blurs the page so the chat is the only thing in focus. Tapping it closes the chat. */}
      {open && <div aria-hidden onClick={() => setOpen(false)} className="fixed inset-0 z-[45] bg-slate-950/45 backdrop-blur-[3px] [animation:mn-veil_.2s_ease-out]" />}

      {/* Panel */}
      {open && (
        <div className="mn-chat-panel fixed bottom-24 right-5 z-50 flex h-[34rem] max-h-[calc(100dvh-7.5rem)] w-[23rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-2xl">
          <div className="jp-head bg-gradient-to-r from-teal-600 to-lime-500 px-4 pb-3 pt-3 text-white">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20">{mode === "ai" ? <Lantern className="h-5 w-5" /> : <ToriiIcon className="h-5 w-5" />}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">{mode === "ai" ? "MedNeed Assistant" : "MedNeed store team"}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-white/85">
                  {mode === "ai" ? (
                    "お手伝いします · Usually replies instantly"
                  ) : (
                    <>
                      <span className={`h-1.5 w-1.5 rounded-full ${live === "live" || live === "polling" ? "bg-lime-200" : "bg-white/50"}`} />
                      {user ? (live === "live" || live === "polling" ? "Connected · replies appear here" : "Connecting…") : "Sign in to chat with us"}
                    </>
                  )}
                </p>
              </div>
            </div>
            {aiEnabled && (
              <div role="tablist" aria-label="Who do you want to talk to?" className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-black/15 p-1 text-xs font-semibold">
                {([
                  ["ai", "AI assistant", Sparkles],
                  ["store", "Store team", UserRound],
                ] as const).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={mode === key}
                    onClick={() => setMode(key)}
                    className={`relative flex items-center justify-center gap-1.5 rounded-full py-1.5 transition-colors ${mode === key ? "bg-white text-teal-800 shadow-sm" : "text-white/90 hover:bg-white/10"}`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                    {key === "store" && mode !== "store" && chat.unread > 0 && <span className="h-2 w-2 rounded-full bg-rose-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {mode === "ai" && aiEnabled ? (
            <AiChat onHuman={() => setMode("store")} />
          ) : (
            <StoreChatView chat={chat} signedIn={Boolean(user)} ready={ready} pendingRef={pendingRef} onClearRef={() => setPendingRef(null)} nextPath={path} />
          )}
        </div>
      )}
    </>
  );
}

function AiChat({ onHuman }: { onHuman: () => void }) {
  const [messages, setMessages] = useState<Turn[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // With only the greeting showing, stay at the top so the illustration is visible.
    if (scroller.current) scroller.current.scrollTop = messages.length > 1 || busy ? scroller.current.scrollHeight : 0;
  }, [messages, busy]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Turn[] = [...messages, { role: "user", text: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send only the real exchange, not the canned greeting.
        body: JSON.stringify({ messages: next.filter((m) => m !== GREETING).map((m) => ({ role: m.role, text: m.text })) }),
      });
      const data = await res.json().catch(() => ({}));
      const answer = res.ok ? data.answer : data.error || "Sorry, I couldn't answer that right now. Please try again.";
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Network error. Please check your connection and try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="jp-room relative min-h-0 flex-1 overflow-hidden bg-page">
      <Petals />
      <div ref={scroller} className="jp-content h-full space-y-3 overflow-y-auto p-4">
        {messages.length === 1 && <div className="pb-1"><Scene /></div>}
        {messages.map((m, i) => (
          <div key={i} className={`jp-in ${m.role === "user" ? "flex justify-end" : "flex justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                m.role === "user" ? "rounded-br-sm bg-teal-600 text-white" : "jp-paper rounded-bl-sm border"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="jp-paper flex items-center gap-1.5 rounded-2xl rounded-bl-sm border px-3.5 py-2.5 shadow-sm">
              <span className="jp-typing" />
              <span className="jp-typing" style={{ animationDelay: "0.15s" }} />
              <span className="jp-typing" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        )}
        {messages.length === 1 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-tint-fg transition-colors hover:bg-tint">
                {s}
              </button>
            ))}
          </div>
        ) : (
          !busy && (
            <button onClick={onHuman} className="mx-auto flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-tint-fg hover:bg-tint">
              <UserRound className="h-3.5 w-3.5" /> Talk to the store team instead
            </button>
          )
        )}
      </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-line bg-surface p-3"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          maxLength={1000}
          disabled={busy}
          className="min-w-0 flex-1 rounded-full border border-line bg-subtle px-4 py-2 text-sm text-ink caret-teal-500 outline-none transition-colors placeholder:text-ink-muted focus:border-teal-500 focus:bg-surface"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-600 text-white transition-colors hover:bg-teal-700 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </>
  );
}
