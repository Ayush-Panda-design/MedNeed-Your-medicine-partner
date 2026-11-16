"use client";

import Link from "next/link";
import { AlertCircle, Check, Clock, FileText, Package } from "lucide-react";
import { dayLabel, timeOf } from "./format";
import type { Msg } from "./useStoreChat";

type Side = "me" | "them";

/** Where a reference chip leads, for the person looking at it. */
export type RefHref = (ref: NonNullable<Msg["ref"]>) => string;

export function RefChip({ r, href, onDark }: { r: NonNullable<Msg["ref"]>; href?: string; onDark?: boolean }) {
  const Icon = r.type === "order" ? Package : FileText;
  const cls = `mb-1 inline-flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold ${onDark ? "bg-white/20 text-white" : "bg-tint text-tint-fg"}`;
  const inner = (
    <>
      <Icon className="h-3 w-3 shrink-0" /> <span className="truncate">{r.label}</span>
    </>
  );
  return href ? (
    <Link href={href} className={`${cls} hover:opacity-90`}>
      {inner}
    </Link>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

/**
 * One conversation as chat bubbles: my messages on the right, theirs on the left, grouped by day,
 * with a small time and a delivery tick (sending, sent, seen) on my messages.
 */
export function Bubbles({
  messages,
  mine,
  seenAt,
  onRetry,
  refHref,
  theirLabel,
}: {
  messages: Msg[];
  /** Which sender is "me" in this view. */
  mine: "customer" | "staff";
  /** When the other side last read the conversation; my messages up to then show as seen. */
  seenAt: string | null;
  onRetry?: (clientId: string) => void;
  refHref?: RefHref;
  theirLabel?: string;
}) {
  const out: React.ReactNode[] = [];
  let lastDay = "";
  let lastRole = "";
  messages.forEach((m, i) => {
    const day = dayLabel(m.at);
    if (day !== lastDay) {
      out.push(
        <div key={`d${m.at}${i}`} className="my-2 flex justify-center">
          <span className="rounded-full bg-subtle px-3 py-1 text-[11px] font-medium text-ink-muted">{day}</span>
        </div>,
      );
      lastDay = day;
      lastRole = "";
    }
    if (m.role === "system") {
      out.push(
        <p key={m.id} className="my-1 text-center text-[11px] text-ink-muted">
          {m.body}
        </p>,
      );
      return;
    }
    const side: Side = m.role === mine ? "me" : "them";
    const first = lastRole !== m.role;
    lastRole = m.role;
    const seen = side === "me" && !m.state && seenAt != null && new Date(m.at) <= new Date(seenAt);
    out.push(
      <div key={m.clientId && m.state ? `c${m.clientId}` : m.id} className={`jp-in flex ${side === "me" ? "justify-end" : "justify-start"} ${first ? "mt-2" : "mt-0.5"}`}>
        <div className={`flex max-w-[85%] flex-col ${side === "me" ? "items-end" : "items-start"}`}>
          {first && side === "them" && <span className="mb-0.5 ml-1 text-[11px] font-medium text-ink-muted">{m.senderName ?? theirLabel ?? "Store team"}</span>}
          <div
            className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm [overflow-wrap:anywhere] ${
              side === "me" ? `rounded-br-md bg-teal-600 text-white ${m.state === "sending" ? "opacity-70" : ""}` : "jp-paper rounded-bl-md border"
            } ${m.state === "failed" ? "ring-2 ring-rose-400" : ""}`}
          >
            {m.ref && <div><RefChip r={m.ref} href={refHref?.(m.ref)} onDark={side === "me"} /></div>}
            {m.body}
          </div>
          <div className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-ink-muted">
            {m.state === "failed" ? (
              <button type="button" onClick={() => m.clientId && onRetry?.(m.clientId)} className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline">
                <AlertCircle className="h-3 w-3" /> {m.error ?? "Not sent"} · Retry
              </button>
            ) : (
              <>
                <span>{timeOf(m.at)}</span>
                {side === "me" && (m.state === "sending" ? <Clock className="h-3 w-3" aria-label="Sending" /> : seen ? <span className="jp-hanko" title="Seen" aria-label="Seen">既読</span> : <Check className="h-3 w-3" aria-label="Sent" />)}
              </>
            )}
          </div>
        </div>
      </div>,
    );
  });
  return <>{out}</>;
}
