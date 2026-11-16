import { handle, ok } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { listThreads } from "@/server/chat/service";

export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  await requireApiStaff(["admin", "pharmacist"]);
  const sp = req.nextUrl.searchParams;
  const f = sp.get("filter");
  const filter = f === "unread" || f === "closed" || f === "all" ? f : "open";
  return ok(await listThreads({ filter, q: sp.get("q") ?? undefined }), { headers: { "Cache-Control": "no-store" } });
});
