"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowDown, Loader2, LogIn } from "lucide-react";
import { useState } from "react";
import { Bubbles } from "./Bubbles";
import { Composer } from "./Composer";
import { Petals, Scene } from "./JpArt";
import type { Ref, useStoreChat } from "./useStoreChat";

type Chat = ReturnType<typeof useStoreChat>;

const refHref = (r: Ref | NonNullable<Chat["messages"][number]["ref"]>) => (r.type === "order" ? `/account/orders/${r.id}` : `/account/prescriptions/${r.id}`);

export function StoreChatView({
  chat,
  signedIn,
  ready,
  pendingRef,
  onClearRef,
  nextPath,
}: {
  chat: Chat;
  signedIn: boolean;
  ready: boolean;
  pendingRef: Ref | null;
  onClearRef: () => void;
  nextPath: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [newBelow, setNewBelow] = useState(false);
  const count = chat.messages.length;

  const toBottom = (smooth = false) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setNewBelow(false);
  };

  // Follow new messages only while the reader is at the bottom; otherwise offer a "new messages" button.
  useEffect(() => {
    if (stick.current) toBottom();
    else if (count) setNewBelow(true);
  }, [count]);
  useEffect(() => {
    toBottom();
  }, [chat.loaded]);

  if (!ready) return <div className="grid flex-1 place-items-center bg-page"><Loader2 className="h-5 w-5 animate-spin text-ink-muted" /></div>;

  if (!signedIn) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-page p-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-tint text-tint-fg"><LogIn className="h-5 w-5" /></span>
        <p className="text-sm font-semibold text-ink">Sign in to message the store team</p>
        <p className="text-xs text-ink-muted">So we know who we're talking to and can see your orders and prescriptions. The AI assistant works without signing in.</p>
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700">Sign in</Link>
      </div>
    );
  }

  return (
    <>
      <div className="jp-room relative flex-1 overflow-hidden bg-page">
        <Petals />
        <div
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            if (stick.current) setNewBelow(false);
          }}
          className="jp-content h-full overflow-y-auto p-4"
        >
          {!chat.loaded ? (
            <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-ink-muted" /></div>
          ) : count === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div className="max-w-[18rem]">
                <Scene />
                <p className="mt-3 text-base font-bold tracking-wide text-ink">いらっしゃいませ</p>
                <p className="text-xs font-semibold text-teal-700 dark:text-lime-300">Welcome to MedNeed</p>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">Ask if a medicine is in stock, about your prescription, or about an order. A real person from the store will reply here.</p>
              </div>
            </div>
          ) : (
            <Bubbles messages={chat.messages} mine="customer" seenAt={chat.staffReadAt} onRetry={chat.retry} refHref={refHref} theirLabel="Store team" />
          )}
          {chat.loadError && <p className="mt-3 text-center text-xs text-rose-600">Couldn't refresh. <button className="font-semibold underline" onClick={() => void chat.reload()}>Try again</button></p>}
        </div>
        {newBelow && (
          <button onClick={() => toBottom(true)} className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
            <ArrowDown className="h-3.5 w-3.5" /> New messages
          </button>
        )}
      </div>
      {chat.closed && chat.messages.length > 0 && <p className="border-t border-line bg-subtle px-4 py-1.5 text-center text-[11px] text-ink-muted">This conversation was marked as resolved. Send a message to reopen it.</p>}
      <Composer onSend={(t) => { chat.send(t, pendingRef); onClearRef(); stick.current = true; }} placeholder="Message the store team..." pendingRef={pendingRef} onClearRef={onClearRef} autoFocus />
    </>
  );
}
