"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { RefChip } from "./Bubbles";
import type { Ref } from "./useStoreChat";

/** Message box that grows with the text. Enter sends, Shift+Enter makes a new line. */
export function Composer({
  onSend,
  placeholder = "Type your message...",
  disabled,
  autoFocus,
  pendingRef,
  onClearRef,
  max = 2000,
}: {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  pendingRef?: Ref | null;
  onClearRef?: () => void;
  max?: number;
}) {
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);
  useEffect(() => {
    if (autoFocus) area.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
    area.current?.focus();
  };

  return (
    <div className="border-t border-line bg-surface p-3">
      {pendingRef && (
        <div className="mb-2 flex items-center gap-2 text-[11px] text-ink-muted">
          About: <RefChip r={pendingRef} />
          <button type="button" onClick={onClearRef} aria-label="Remove" className="rounded-full p-0.5 hover:bg-subtle"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2"
      >
        <textarea
          ref={area}
          value={text}
          rows={1}
          maxLength={max}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Message"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-[120px] min-h-[38px] min-w-0 flex-1 resize-none rounded-2xl border border-line bg-subtle px-4 py-2 text-sm leading-snug text-ink caret-teal-500 outline-none transition-colors placeholder:text-ink-muted focus:border-teal-500 focus:bg-surface"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          aria-label="Send"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-600 text-white transition-colors hover:bg-teal-700 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
