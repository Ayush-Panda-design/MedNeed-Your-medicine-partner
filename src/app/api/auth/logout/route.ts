import { z } from "zod";
import { handle, ok } from "@/server/http";
import { getClaims, revokeCurrentSession, revokeUserSessions } from "@/server/auth/session";

const schema = z.object({ all: z.boolean().optional() }).default({});

export const POST = handle(async (req) => {
  let all = false;
  try {
    all = schema.parse(await req.json()).all === true;
  } catch {
    /* empty body is fine */
  }
  if (all) {
    const claims = await getClaims();
    if (claims) await revokeUserSessions(claims.userId);
  }
  await revokeCurrentSession();
  return ok();
});
