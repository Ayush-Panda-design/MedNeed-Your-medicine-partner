import { z } from "zod";
import { handle, ok, readJson } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { getThreadForUser, listMessages, sendCustomerMessage } from "@/server/chat/service";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

/** The signed-in customer's own conversation with the store team. */
export const GET = handle(async (req) => {
  const { userId } = await requireApiUser();
  const after = Math.max(0, Number(req.nextUrl.searchParams.get("after")) || 0);
  const thread = await getThreadForUser(userId);
  if (!thread) return ok({ messages: [], unread: 0, status: "open", staffReadAt: null }, NO_STORE);
  const messages = await listMessages(thread.id, after);
  return ok(
    { messages, unread: thread.customer_unread, status: thread.status, staffReadAt: thread.staff_read_at ? new Date(thread.staff_read_at).toISOString() : null },
    NO_STORE,
  );
});

const send = z.object({
  body: z.string().min(1, "Please type a message.").max(4000),
  clientId: z.string().min(8).max(64).optional(),
  ref: z.object({ type: z.enum(["order", "prescription"]), id: z.string().uuid() }).nullish(),
});

export const POST = handle(async (req) => {
  const { userId } = await requireApiUser();
  const input = await readJson(req, send);
  const message = await sendCustomerMessage(userId, input.body, { clientId: input.clientId, ref: input.ref ?? null });
  return ok({ message }, NO_STORE);
});
