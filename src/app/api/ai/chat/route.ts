import { z } from "zod";
import { clientIp, handle, ok, readJson } from "@/server/http";
import { rateLimit } from "@/server/security/rate-limit";
import { getClaims } from "@/server/auth/session";
import { answerSupportChat, type ChatTurn } from "@/server/ai/chatbot";

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().min(1).max(1000) }))
    .min(1)
    .max(20),
});

export const POST = handle(async (req) => {
  const { messages } = await readJson(req, schema);
  // Signed-in customers get their own order context; the limit protects the shared free-tier quota either way.
  const claims = await getClaims();
  await rateLimit(`ai-chat:${claims?.userId ?? clientIp(req)}`, 30, 3600, "You've sent a lot of messages. Please try again in a little while.");
  const result = await answerSupportChat(messages as ChatTurn[], claims?.userId ?? null);
  return ok(result, { headers: { "Cache-Control": "no-store" } });
});
