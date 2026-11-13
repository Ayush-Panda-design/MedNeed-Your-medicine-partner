import { z } from "zod";
import { clientIp, handle, ok, readJson } from "@/server/http";
import { rateLimit } from "@/server/security/rate-limit";
import { answerMedicineQuestion } from "@/server/ai/medicine-qa";

export const POST = handle(async (req) => {
  const { slug, question } = await readJson(req, z.object({ slug: z.string().min(1).max(200), question: z.string().min(1).max(300) }));
  // Protects the shared free-tier quota from a single abuser; cached answers don't count against the model anyway.
  await rateLimit(`ai-qa:${clientIp(req)}`, 20, 3600, "You've asked a lot of questions. Please try again in a little while.");
  return ok(await answerMedicineQuestion(slug, question), { headers: { "Cache-Control": "no-store" } });
});
