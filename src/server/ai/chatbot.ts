import { createHash } from "crypto";
import { ApiError } from "../http";
import { aiEnabled } from "../env";
import { getSettings, publicSettings } from "../orders/settings";
import { listOrdersForUser } from "../orders/queries";
import { faqs } from "@/lib/faq";
import { AiUnavailable, generate, type Part } from "./gemini";
import { cached } from "./cache";

export type ChatTurn = { role: "user" | "assistant"; text: string };

const MAX_TURNS = 10;
const rupees = (n: number) => `Rs ${Math.round(n)}`;

/** Compact, read-only snapshot of what the assistant is allowed to know, assembled fresh per request. */
async function knowledge(userId: string | null): Promise<string> {
  const settings = await getSettings();
  const p = publicSettings(settings);
  const lines: string[] = [];
  lines.push(`Shop: ${p.shopName}. Two branches in Bhubaneswar, run as one shop.`);
  if (p.hours) {
    const h = p.hours as { open?: string; close?: string };
    if (h.open && h.close) lines.push(`Open every day ${h.open}-${h.close}.`);
  }
  if (p.deliveryEnabled) {
    lines.push(
      `Home delivery within ${p.maxRadiusKm} km. Free within ${p.freeRadiusKm} km, otherwise a distance-based fee (about ${rupees(p.perKmRate)}/km).` +
        (p.minOrder ? ` Minimum order ${rupees(p.minOrder)}.` : ""),
    );
  }
  if (p.pickupEnabled) lines.push("Store pickup is available: collect from the branch once the order is ready.");
  lines.push("Payments: cash on delivery and online payment (UPI, card, netbanking via Razorpay).");
  lines.push("Prescription (Rx) medicines need a valid prescription, verified by a pharmacist before packing. OTC items can be ordered directly.");

  lines.push("\nFAQ:");
  for (const f of faqs) lines.push(`Q: ${f.q}\nA: ${f.a}`);

  if (userId) {
    const orders = (await listOrdersForUser(userId)).slice(0, 5);
    if (orders.length) {
      lines.push("\nThe signed-in customer's recent orders (most recent first):");
      for (const o of orders) {
        const when = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : "";
        const slot = o.slotWindow ? `, slot ${o.slotDate ?? ""} ${o.slotWindow}` : "";
        lines.push(
          `- #${o.orderNumber}: ${o.status.replace(/_/g, " ")}, ${o.fulfilment}, ${o.itemCount} item(s), ${rupees(o.total)}, placed ${when}${slot}. ` +
            `Payment ${o.paymentMethod} (${o.paymentStatus}).` +
            (o.requiresPrescription ? ` Prescription ${o.prescriptionStatus}.` : ""),
        );
      }
      lines.push("Order status meanings: pending_payment -> awaiting payment; confirmed -> accepted; packed -> being prepared; out_for_delivery -> on the way; delivered -> completed; cancelled -> cancelled.");
    } else {
      lines.push("\nThe signed-in customer has no orders yet.");
    }
  }
  return lines.join("\n");
}

const SYSTEM = (facts: string, signedIn: boolean) =>
  `You are the support assistant for MedNeed, an online pharmacy in Bhubaneswar, India. ` +
  `Answer only using the FACTS below and the conversation. Be warm, concise and practical (2-4 sentences). ` +
  `Rules:\n` +
  `- Never give medical advice, diagnosis, drug dosing, or tell anyone to start/stop/combine medicines. For anything clinical, advise them to consult a doctor or our pharmacist.\n` +
  `- Do not invent prices, stock, order details, delivery times or policies that are not in the FACTS. If you don't know, say so and point to the right place (search at /medicines, the Account > Orders page, or contacting the pharmacy).\n` +
  `- For questions about a specific order, use only the customer's orders listed in FACTS. ` +
  (signedIn ? `` : `The customer is NOT signed in, so you cannot see their orders — ask them to sign in and open Account > Orders.\n`) +
  `- Never reveal delivery OTP codes, payment identifiers, or anything about other customers.\n` +
  `- Keep answers about MedNeed; politely decline unrelated topics.\n\n` +
  `FACTS:\n${facts}`;

/**
 * Answer a support question grounded in store settings, the FAQ and (when signed in) the customer's own orders.
 * Anonymous single-question hits are cached briefly to spare the free-tier quota; anything with order context is never cached.
 */
export async function answerSupportChat(turns: ChatTurn[], userId: string | null): Promise<{ answer: string }> {
  if (!aiEnabled()) throw new ApiError(503, "The assistant is not available right now.");
  const history = turns.filter((t) => t.text.trim()).slice(-MAX_TURNS);
  if (!history.length || history[history.length - 1].role !== "user") throw new ApiError(400, "Ask a question to get started.");

  const facts = await knowledge(userId);
  const parts: Part[] = history.map((t) => ({ text: `${t.role === "user" ? "Customer" : "Assistant"}: ${t.text}` }));
  parts.push({ text: "Assistant:" });
  const run = () => generate(parts, { system: SYSTEM(facts, Boolean(userId)), temperature: 0.3, maxOutputTokens: 400 });

  try {
    // Only a single anonymous question (no running conversation, no personal data) is safe to cache and reuse.
    if (!userId && history.length === 1) {
      const key = createHash("sha256").update(history[0].text.toLowerCase().trim()).digest("hex");
      const answer = await cached("support-chat", key, 24 * 3600, async () => ({ answer: await run() }));
      return answer;
    }
    return { answer: await run() };
  } catch (e) {
    if (e instanceof AiUnavailable) throw new ApiError(503, "The assistant is busy right now. Please try again in a moment.");
    throw e;
  }
}
