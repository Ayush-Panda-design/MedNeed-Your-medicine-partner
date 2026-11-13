import { z } from "zod";
import { ApiError, clientIp, handle, ok } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";
import { aiEnabled } from "@/server/env";
import { readPrescription } from "@/server/ai/prescription-read";
import { AiUnavailable } from "@/server/ai/gemini";

type Ctx = { params: Promise<{ id: string }> };

// A pharmacist (or admin) asks the model to transcribe a prescription into the review form. Suggestions only; nothing is approved here.
export const POST = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin", "pharmacist"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Prescription not found.");
  if (!aiEnabled()) throw new ApiError(503, "AI reading is not available right now.");
  await rateLimit(`ai-rx:${user.id}`, 60, 3600, "Too many AI reads. Please wait a little while.");
  try {
    const reading = await readPrescription(id);
    if (!reading) throw new ApiError(404, "No readable files on this prescription.");
    return ok({ reading }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof AiUnavailable) throw new ApiError(503, "The AI reader is busy right now. Please try again in a moment.");
    throw e;
  }
});
