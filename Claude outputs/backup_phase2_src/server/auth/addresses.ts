import { db, query } from "../db";
import { ApiError } from "../http";
import { z } from "zod";

import { INDIAN_STATES, type Address } from "@/lib/addresses";
export { INDIAN_STATES };

export const addressSchema = z.object({
  label: z.enum(["home", "work", "other"]).default("home"),
  fullName: z.string().trim().min(2, "Enter the recipient's name").max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  line1: z.string().trim().min(3, "Enter house / flat / street").max(150),
  line2: z.string().trim().max(150).optional().or(z.literal("")),
  landmark: z.string().trim().max(100).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter the city").max(60),
  state: z.enum(INDIAN_STATES, { message: "Choose a state" }),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;

const COLS = `id, label, full_name, phone, line1, line2, landmark, city, state, pincode, is_default`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const map = (r: any): Address => ({
  id: r.id, label: r.label, fullName: r.full_name, phone: r.phone, line1: r.line1, line2: r.line2, landmark: r.landmark,
  city: r.city, state: r.state, pincode: r.pincode, isDefault: r.is_default,
});

const MAX_ADDRESSES = 10;

export async function listAddresses(userId: string) {
  const rows = await query(`select ${COLS} from addresses where user_id = $1 order by is_default desc, created_at desc`, [userId]);
  return rows.map(map);
}

export async function createAddress(userId: string, input: AddressInput) {
  const database = await db();
  return database.tx(async (t) => {
    const count = await t.query<{ n: number }>(`select count(*)::int as n from addresses where user_id = $1`, [userId]);
    if (count[0].n >= MAX_ADDRESSES) throw new ApiError(400, `You can save up to ${MAX_ADDRESSES} addresses.`, "address_limit");
    const makeDefault = input.isDefault === true || count[0].n === 0;
    if (makeDefault) await t.query(`update addresses set is_default = false where user_id = $1`, [userId]);
    const rows = await t.query(
      `insert into addresses (user_id, label, full_name, phone, line1, line2, landmark, city, state, pincode, is_default)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning ${COLS}`,
      [userId, input.label, input.fullName, input.phone, input.line1, input.line2 || null, input.landmark || null, input.city, input.state, input.pincode, makeDefault],
    );
    return map(rows[0]);
  });
}

export async function updateAddress(userId: string, id: string, input: AddressInput) {
  const database = await db();
  return database.tx(async (t) => {
    const existing = await t.query<{ is_default: boolean }>(`select is_default from addresses where id = $1 and user_id = $2`, [id, userId]);
    if (!existing[0]) throw new ApiError(404, "Address not found.");
    const makeDefault = input.isDefault === true || (existing[0].is_default && input.isDefault !== false);
    if (makeDefault) await t.query(`update addresses set is_default = false where user_id = $1 and id <> $2`, [userId, id]);
    const rows = await t.query(
      `update addresses set label=$3, full_name=$4, phone=$5, line1=$6, line2=$7, landmark=$8, city=$9, state=$10, pincode=$11,
         is_default=$12, updated_at=now() where id = $1 and user_id = $2 returning ${COLS}`,
      [id, userId, input.label, input.fullName, input.phone, input.line1, input.line2 || null, input.landmark || null, input.city, input.state, input.pincode, makeDefault],
    );
    return map(rows[0]);
  });
}

export async function deleteAddress(userId: string, id: string) {
  const database = await db();
  await database.tx(async (t) => {
    const gone = await t.query<{ is_default: boolean }>(`delete from addresses where id = $1 and user_id = $2 returning is_default`, [id, userId]);
    if (!gone[0]) throw new ApiError(404, "Address not found.");
    if (gone[0].is_default) {
      await t.query(
        `update addresses set is_default = true where id = (select id from addresses where user_id = $1 order by created_at desc limit 1)`,
        [userId],
      );
    }
  });
}
