import { z } from "zod";
import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { audit } from "@/server/auth/users";
import { query } from "@/server/db";

const input = z.object({
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
  area: z.string().trim().max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  isActive: z.boolean(),
});

export const GET = handle(async () => {
  await requireApiStaff(["admin"]);
  const rows = await query(`select pincode, area, lat, lng, is_active from service_pincodes order by pincode`);
  return ok({ pincodes: rows.map((r) => ({ pincode: r.pincode as string, area: r.area as string, lat: Number(r.lat), lng: Number(r.lng), isActive: r.is_active as boolean })) });
});

// Add or update one pincode. Inactive pincodes are refused at checkout even if the customer shares an exact location.
export const POST = handle(async (req) => {
  const { user } = await requireApiStaff(["admin"]);
  const v = await readJson(req, input);
  await query(
    `insert into service_pincodes (pincode, area, lat, lng, is_active) values ($1,$2,$3,$4,$5)
     on conflict (pincode) do update set area = excluded.area, lat = excluded.lat, lng = excluded.lng, is_active = excluded.is_active`,
    [v.pincode, v.area, v.lat, v.lng, v.isActive],
  );
  await audit(user.id, "orders.pincode.saved", { pincode: v.pincode, isActive: v.isActive }, clientIp(req));
  return ok({ saved: true }, { status: 201 });
});
