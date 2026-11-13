import type { Db } from "../db";
import { isProd } from "../env";
import { hashPassword, passwordProblem } from "../security/password";

/**
 * Creates the first admin if none exists.
 *  - Set ADMIN_EMAIL and ADMIN_PASSWORD to choose the credentials (required in production).
 *  - In development, falls back to admin@medneed.local / Admin@12345 and says so in the console.
 * The admin must still enrol in two-factor authentication at first sign-in.
 */
export async function bootstrapAdmin(db: Db) {
  const existing = await db.query<{ n: number }>(`select count(*)::int as n from user_roles where role = 'admin'`);
  if (existing[0].n > 0) return;

  let email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  let password = process.env.ADMIN_PASSWORD;
  const usingDefaults = !email || !password;

  if (usingDefaults) {
    if (isProd()) {
      console.warn("[auth] No admin exists. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first admin.");
      return;
    }
    email = "admin@medneed.local";
    password = "Admin@12345";
  }

  const problem = passwordProblem(password!, email);
  if (problem) {
    console.warn(`[auth] ADMIN_PASSWORD rejected: ${problem}`);
    return;
  }

  const hash = await hashPassword(password!);
  try {
    await db.tx(async (t) => {
      const rows = await t.query<{ id: string }>(
        `insert into users (name, email, email_verified, password_hash) values ('Administrator', $1, true, $2)
         on conflict do nothing returning id`,
        [email, hash],
      );
      if (!rows[0]) return; // email already used by a non-admin account; do not escalate it silently
      await t.query(`insert into user_roles (user_id, role) values ($1, 'admin'), ($1, 'customer')`, [rows[0].id]);
    });
  } catch (err) {
    console.warn("[auth] Could not create bootstrap admin:", err);
    return;
  }

  console.log(
    usingDefaults
      ? `[auth] Created development admin ${email} with password "${password}". Sign in at /admin/login (you will set up 2FA).`
      : `[auth] Created admin ${email}. Sign in at /admin/login and set up 2FA.`,
  );
}
