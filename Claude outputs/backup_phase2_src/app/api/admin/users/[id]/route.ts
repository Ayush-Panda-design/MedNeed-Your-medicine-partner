import { z } from "zod";
import { clientIp, handle, ok, readJson, ApiError } from "@/server/http";
import { requireApiStaff, revokeUserSessions } from "@/server/auth/session";
import { audit, getUserById, publicUser, setRoles, ALL_ROLES, type Role } from "@/server/auth/users";
import { query } from "@/server/db";

const schema = z.object({
  roles: z.array(z.enum(ALL_ROLES as [Role, ...Role[]])).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  resetTwoFactor: z.boolean().optional(),
});

async function otherActiveAdmins(excludeId: string) {
  const rows = await query<{ n: number }>(
    `select count(*)::int as n from user_roles r join users u on u.id = r.user_id
     where r.role = 'admin' and u.status = 'active' and u.id <> $1`,
    [excludeId],
  );
  return rows[0].n;
}

export const PATCH = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { user: actor, claims } = await requireApiStaff(["admin"]);
  const { id } = await ctx.params;
  const body = await readJson(req, schema);
  const target = await getUserById(id).catch(() => null);
  if (!target) throw new ApiError(404, "User not found.");

  const losesAdmin = target.roles.includes("admin") && (body.status === "disabled" || (body.roles && !body.roles.includes("admin")));
  if (losesAdmin) {
    if (target.id === actor.id) throw new ApiError(400, "You cannot remove your own admin access.", "self_lockout");
    if ((await otherActiveAdmins(target.id)) === 0) throw new ApiError(400, "At least one active admin is required.", "last_admin");
  }

  if (body.roles) {
    const roles = Array.from(new Set<Role>(["customer", ...body.roles]));
    await setRoles(target.id, roles);
    await audit(actor.id, "admin.user.roles_changed", { userId: target.id, from: target.roles, to: roles }, clientIp(req));
  }
  if (body.status) {
    await query(`update users set status = $2, updated_at = now() where id = $1`, [target.id, body.status]);
    await audit(actor.id, `admin.user.${body.status === "disabled" ? "disabled" : "enabled"}`, { userId: target.id }, clientIp(req));
  }
  if (body.resetTwoFactor) {
    if (target.id === actor.id) throw new ApiError(400, "Use one of your recovery codes if you lost your device.", "self_reset");
    await query(`delete from user_totp where user_id = $1`, [target.id]);
    await query(`delete from totp_recovery_codes where user_id = $1`, [target.id]);
    await audit(actor.id, "admin.user.2fa_reset", { userId: target.id }, clientIp(req));
  }
  // Role or status changes take effect immediately: existing sessions are ended.
  if (body.roles || body.status === "disabled" || body.resetTwoFactor) await revokeUserSessions(target.id, target.id === actor.id ? claims.sid : undefined);

  return ok({ user: publicUser((await getUserById(target.id))!) });
});
