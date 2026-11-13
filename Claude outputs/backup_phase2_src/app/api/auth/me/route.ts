import { handle, ok } from "@/server/http";
import { clearAuthCookies, getClaims } from "@/server/auth/session";
import { getUserById, isStaff, publicUser } from "@/server/auth/users";

export const GET = handle(async () => {
  const claims = await getClaims();
  if (!claims) return ok({ user: null }, { headers: { "Cache-Control": "no-store" } });
  const user = await getUserById(claims.userId);
  if (!user || user.status !== "active") {
    await clearAuthCookies();
    return ok({ user: null }, { headers: { "Cache-Control": "no-store" } });
  }
  return ok({ user: { ...publicUser(user), tfa: claims.tfa, isStaff: isStaff(user.roles) } }, { headers: { "Cache-Control": "no-store" } });
});
