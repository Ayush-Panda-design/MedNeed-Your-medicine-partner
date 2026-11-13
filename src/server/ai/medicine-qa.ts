import { ApiError } from "../http";
import { aiEnabled } from "../env";
import { getProductBySlug } from "../catalog/queries";
import { cached } from "./cache";
import { AiUnavailable, generate } from "./gemini";

export type QaResult = { answer: string; disclaimer: string };

const DISCLAIMER = "This is general information from the product details, not medical advice. For dosing or anything specific to you, please ask a doctor or our pharmacist.";

/**
 * Answer a question about ONE medicine using only that product's own verified fields. The model is told to stick to
 * the supplied facts, never diagnose, and defer to a pharmacist — so answers stay grounded and safe. Cached per
 * (slug, question) to protect the free-tier quota.
 */
export async function answerMedicineQuestion(slug: string, question: string): Promise<QaResult> {
  if (!aiEnabled()) throw new ApiError(503, "The assistant is not available right now.", "ai_off");
  const q = question.trim().slice(0, 300);
  if (q.length < 3) throw new ApiError(400, "Please type a question.", "too_short");

  const p = await getProductBySlug(slug);
  if (!p) throw new ApiError(404, "Medicine not found.");

  const facts = [
    `Name: ${p.name}`,
    `Manufacturer: ${p.manufacturer}`,
    `Composition: ${p.composition || p.salts.map((s) => `${s.name} ${s.strength}`).join(", ") || "not listed"}`,
    `Form: ${p.form}`,
    `Pack: ${p.packSize}`,
    `Prescription status: ${p.schedule === "OTC" ? "Over the counter (no prescription needed)" : "Prescription required"}`,
    `Uses: ${p.uses.length ? p.uses.join("; ") : "not listed"}`,
    `How to use: ${p.howToUse || "not listed"}`,
    `Side effects: ${p.sideEffects.length ? p.sideEffects.join("; ") : "not listed"}`,
    `Precautions: ${p.precautions.length ? p.precautions.join("; ") : "not listed"}`,
    `Description: ${p.description || "not listed"}`,
  ].join("\n");

  const system =
    `You are a helpful assistant on an Indian online pharmacy, answering a customer's question about ONE medicine. ` +
    `Use ONLY the product facts provided. If the answer is not in the facts, say you don't have that detail and suggest ` +
    `asking the pharmacist or doctor. Never diagnose, never recommend a dose or a change in dose, never suggest other ` +
    `medicines, and never claim it treats anything not in the Uses. Keep it to 2-4 short sentences in plain language. ` +
    `If the question is an emergency or about serious symptoms, advise contacting a doctor.`;

  const answer = await cached("medicine-qa", { slug, q: q.toLowerCase() }, 30 * 24 * 3600, async () =>
    generate([{ text: `Product facts:\n${facts}\n\nCustomer question: ${q}` }], { system, temperature: 0.2, maxOutputTokens: 400 }),
  ).catch((e) => {
    if (e instanceof AiUnavailable) throw new ApiError(503, "The assistant is busy right now. Please try again in a moment.", "ai_busy");
    throw e;
  });

  return { answer, disclaimer: DISCLAIMER };
}
