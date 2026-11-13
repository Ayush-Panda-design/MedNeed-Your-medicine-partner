import { ApiError, handle, ok } from "@/server/http";
import { AiUnavailable } from "@/server/ai/gemini";
import { requireApiStaff } from "@/server/auth/session";
import { backfillEmbeddings, embeddingStats } from "@/server/ai/vector-index";

// Admin readout + manual trigger for the semantic-search embedding backfill.
export const GET = handle(async () => {
  await requireApiStaff(["admin"]);
  return ok(await embeddingStats(), { headers: { "Cache-Control": "no-store" } });
});

// Embed one batch of new/changed products on demand, then report fresh coverage.
export const POST = handle(async () => {
  await requireApiStaff(["admin"]);
  let run;
  try {
    run = await backfillEmbeddings(128);
  } catch (e) {
    if (e instanceof AiUnavailable) throw new ApiError(503, `AI embeddings unavailable: ${e.message}`);
    throw e;
  }
  return ok({ run, stats: await embeddingStats() }, { headers: { "Cache-Control": "no-store" } });
});
