import { db, query, type Q } from "../db";

export type Role = "customer" | "admin" | "pharmacist" | "inventory_manager" | "delivery";
export const ALL_ROLES: Role[] = ["customer", "admin", "pharmacist", "inventory_manager", "delivery"];
export const STAFF_ROLES: Role[] = ["admin", "pharmacist", "inventory_manager"];
/** Delivery staff are deliberately not "staff": they have no admin-panel access and no 2FA step. */
export const isStaff = (roles: readonly string[]) => roles.some((r) => (STAFF_ROLES as string[]).includes(r));

export type UserRecord = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  passwordHash: string | null;
  avatarUrl: string | null;
  status: "active" | "disabled";
  createdAt: Date;
  lastLoginAt: Date | null;
  roles: Role[];
};

export type PublicUser = Omit<UserRecord, "passwordHash" | "createdAt" | "lastLoginAt"> & { hasPassword: boolean };

export const publicUser = ({ passwordHash, createdAt, lastLoginAt, ...rest }: UserRecord): PublicUser => {
  void createdAt;
  void lastLoginAt;
  return { ...rest, hasPassword: Boolean(passwordHash) };
};

const SELECT = `
  select u.id, u.name, u.email, u.email_verified, u.phone, u.phone_verified, u.password_hash, u.avatar_url,
         u.status, u.created_at, u.last_login_at,
         coalesce(array_agg(r.role) filter (where r.role is not null), '{}') as roles
  from users u left join user_roles r on r.user_id = u.id`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const map = (r: any): UserRecord => ({
  id: r.id,
  name: r.name,
  email: r.email,
  emailVerified: r.email_verified,
  phone: r.phone,
  phoneVerified: r.phone_verified,
  passwordHash: r.password_hash,
  avatarUrl: r.avatar_url,
  status: r.status,
  createdAt: new Date(r.created_at),
  lastLoginAt: r.last_login_at ? new Date(r.last_login_at) : null,
  roles: (r.roles ?? []) as Role[],
});

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Accepts 10-digit Indian mobile numbers, optionally prefixed with +91 / 91 / 0. Returns E.164 or null. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  const ten = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
  return /^[6-9]\d{9}$/.test(ten) ? `+91${ten}` : null;
}

export async function getUserById(id: string) {
  const rows = await query(`${SELECT} where u.id = $1 group by u.id`, [id]);
  return rows[0] ? map(rows[0]) : null;
}

export async function getUserByEmail(email: string) {
  const rows = await query(`${SELECT} where lower(u.email) = $1 group by u.id`, [normalizeEmail(email)]);
  return rows[0] ? map(rows[0]) : null;
}

export async function getUserByPhone(phone: string) {
  const rows = await query(`${SELECT} where u.phone = $1 group by u.id`, [phone]);
  return rows[0] ? map(rows[0]) : null;
}

export async function getRoles(userId: string): Promise<Role[]> {
  const rows = await query<{ role: Role }>(`select role from user_roles where user_id = $1`, [userId]);
  return rows.map((r) => r.role);
}

export async function createUser(input: {
  name?: string | null;
  email?: string | null;
  emailVerified?: boolean;
  phone?: string | null;
  phoneVerified?: boolean;
  passwordHash?: string | null;
  avatarUrl?: string | null;
  roles?: Role[];
}) {
  const database = await db();
  const id = await database.tx(async (t) => {
    const rows = await t.query<{ id: string }>(
      `insert into users (name, email, email_verified, phone, phone_verified, password_hash, avatar_url)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [
        input.name ?? null,
        input.email ? normalizeEmail(input.email) : null,
        input.emailVerified ?? false,
        input.phone ?? null,
        input.phoneVerified ?? false,
        input.passwordHash ?? null,
        input.avatarUrl ?? null,
      ],
    );
    for (const role of input.roles ?? ["customer"]) {
      await t.query(`insert into user_roles (user_id, role) values ($1, $2)`, [rows[0].id, role]);
    }
    return rows[0].id;
  });
  return (await getUserById(id))!;
}

export async function setRoles(userId: string, roles: Role[]) {
  const database = await db();
  await database.tx(async (t) => {
    await t.query(`delete from user_roles where user_id = $1`, [userId]);
    for (const role of roles) await t.query(`insert into user_roles (user_id, role) values ($1, $2)`, [userId, role]);
  });
}

export async function audit(userId: string | null, action: string, detail?: Record<string, unknown>, ip?: string, q?: Q) {
  const run = q ?? query;
  await run(`insert into audit_log (user_id, action, detail, ip) values ($1, $2, $3, $4)`, [userId, action, detail ? JSON.stringify(detail) : null, ip ?? null]);
}

export const isUniqueViolation = (err: unknown) => typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
