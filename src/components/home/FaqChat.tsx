"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import type { Faq } from "@/lib/faq";
import { heroSerif } from "@/lib/fonts";
import "./faq-chat.css";

/** Original illustrated pharmacist avatar (no stock people). */
function Avatar({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={`${className} shrink-0 rounded-full`} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#dcfce7" />
      <path d="M8 46c2-9 8-13 16-13s14 4 16 13z" fill="#ffffff" />
      <path d="M20 33l4 7 4-7" fill="#16a34a" />
      <circle cx="24" cy="21" r="8.5" fill="#d9a57e" />
      <path d="M15 20c0-7 5-10 9-10s10 3 9 11c-2-4-6-5-9-5s-7 1-9 4z" fill="#3b2a20" />
      <circle cx="21" cy="22" r="1" fill="#3b2a20" />
      <circle cx="27" cy="22" r="1" fill="#3b2a20" />
      <path d="M21.5 25.5q2.5 2 5 0" stroke="#3b2a20" strokeWidth="1" fill="none" strokeLinecap="round" />
      <rect x="29" y="37" width="6" height="4" rx="1" fill="#a3e635" />
    </svg>
  );
}

/**
 * FAQ as a conversation with a pharmacist (design from the Lovable concept). Questions are buttons; choosing one
 * adds it to the thread, shows a short typing indicator, then the answer. Answers stay in the thread. Accessible:
 * buttons with aria-expanded / aria-controls, a polite live region, and no animation with reduced motion.
 */
export function FaqChat({ faqs }: { faqs: Faq[] }) {
  const [asked, setAsked] = useState<number[]>([]);
  const [typing, setTyping] = useState<number | null>(null);
  const [reduce, setReduce] = useState(false);
  const thread = useRef<HTMLDivElement>(null);

  useEffect(() => setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  useEffect(() => {
    if (typing === null) return;
    const t = setTimeout(() => setTyping(null), reduce ? 0 : 850);
    return () => clearTimeout(t);
  }, [typing, reduce]);
  useEffect(() => {
    const el = thread.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [asked, typing, reduce]);

  const ask = (i: number) => {
    if (asked.includes(i)) {
      document.getElementById(`faq-a-${i}`)?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
      return;
    }
    setAsked((a) => [...a, i]);
    setTyping(i);
  };

  const openChat = () => {
    // Opens the AI assistant when it is enabled; otherwise the contact page.
    if (document.querySelector(".mn-chat-fab")) window.dispatchEvent(new Event("medneed:open-chat"));
    else window.location.href = "/contact";
  };

  return (
    <section aria-labelledby="faq-title" className={`mx-auto max-w-7xl px-4 pt-16 sm:px-6 ${heroSerif.variable}`}>
      <div className="grid gap-8 lg:grid-cols-[1fr_1.25fr] lg:gap-14">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Questions, answered</p>
          <h2 id="faq-title" data-words className="mn-display text-4xl leading-[1.05] text-slate-900 sm:text-5xl lg:text-6xl">
            <span className="mn-w">Ask</span> <span className="mn-w">our</span> <em className="mn-w mn-accent">pharmacist</em>
          </h2>
          <p className="mt-4 max-w-md text-sm text-slate-600 sm:text-base">Tap a question. Answers stay in the conversation so you can read back anytime.</p>
          <div className="mt-7 flex flex-col items-start gap-2.5" role="group" aria-label="Frequently asked questions">
            {faqs.map((f, i) => {
              const on = asked.includes(i);
              return (
                <button
                  key={f.q}
                  onClick={() => ask(i)}
                  aria-expanded={on}
                  aria-controls={`faq-a-${i}`}
                  className={`fc-q min-h-11 rounded-2xl rounded-bl-md border px-4 py-2.5 text-left text-sm font-medium transition-colors sm:text-[15px] ${on ? "border-teal-300 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-800 hover:border-teal-400"}`}
                >
                  {f.q}
                </button>
              );
            })}
          </div>
        </div>

        <div className="fc-panel overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <Avatar className="h-11 w-11" />
            <div>
              <p className="font-semibold text-slate-900">MedNeed Pharmacist</p>
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-teal-500" /> Registered pharmacist · Bhubaneswar
              </p>
            </div>
          </div>

          <div ref={thread} className="fc-thread flex max-h-[26rem] min-h-[20rem] flex-col gap-4 overflow-y-auto p-5" aria-live="polite">
            <div className="fc-bubble flex items-end gap-2">
              <Avatar className="h-8 w-8" />
              <p className="fc-them max-w-[85%] rounded-3xl rounded-bl-md px-4 py-3 text-sm">Namaskar! Ask me anything about ordering medicines from MedNeed.</p>
            </div>
            {faqs.map((f, i) => (
              <div key={f.q} id={`faq-a-${i}`} hidden={!asked.includes(i)} className={asked.includes(i) ? "flex flex-col gap-3" : undefined} style={{ order: asked.indexOf(i) + 1 }}>
                {asked.includes(i) && (
                  <>
                    <p className="fc-bubble fc-me max-w-[85%] self-end rounded-3xl rounded-br-md px-4 py-3 text-sm font-medium">{f.q}</p>
                    <div className="flex items-end gap-2">
                      <Avatar className="h-8 w-8" />
                      {typing === i ? (
                        <span className="fc-them fc-typing flex gap-1 rounded-3xl rounded-bl-md px-4 py-4" aria-label="Pharmacist is typing">
                          <span /> <span /> <span />
                        </span>
                      ) : (
                        <p className="fc-bubble fc-them max-w-[85%] rounded-3xl rounded-bl-md px-4 py-3 text-sm leading-relaxed">{f.a}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
            <p className="text-sm text-slate-500">Still have a question?</p>
            <button onClick={openChat} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-teal-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">
              <MessageCircle className="h-4 w-4" aria-hidden /> Chat with us
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
