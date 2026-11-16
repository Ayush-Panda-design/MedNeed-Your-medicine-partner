"use client";

import { MessageCircle } from "lucide-react";
import type { OpenChatDetail } from "@/components/SupportChat";

/** Opens the chat on the store-team tab with this order or prescription attached to the next message. */
export function AskStoreButton({ type, id, label, className }: { type: "order" | "prescription"; id: string; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent<OpenChatDetail>("medneed:open-chat", { detail: { mode: "store", ref: { type, id, label } } }))}
      className={className ?? "inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-50"}
    >
      <MessageCircle className="h-4 w-4 text-teal-600" /> Ask the store about this
    </button>
  );
}
