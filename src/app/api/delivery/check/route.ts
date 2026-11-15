import { ApiError, clientIp, handle, ok } from "@/server/http";
import { query } from "@/server/db";
import { rateLimit } from "@/server/security/rate-limit";
import { getSettings } from "@/server/orders/settings";
import { resolveDistance } from "@/server/orders/delivery";

/**
 * Public "do you deliver to my pincode?" check for the header. Uses the same rules as checkout (service pincodes and
 * the delivery radius), but the final answer is always given at checkout with the full address.
 */
export const GET = handle(async (req) => {
  const pincode = (req.nextUrl.searchParams.get("pincode") ?? "").trim();
  if (!/^[1-9]\d{5}$/.test(pincode)) throw new ApiError(400, "Enter a valid 6-digit pincode.", "invalid_input");
  await rateLimit(`pincode-check:${clientIp(req)}`, 30, 60);
  const settings = await getSettings();
  const area = (await query<{ area: string }>(`select area from service_pincodes where pincode = $1 and is_active`, [pincode]))[0]?.area ?? null;
  if (!settings.delivery.enabled) {
    return ok({ pincode, served: false, pickup: settings.pickup.enabled, message: "Home delivery is paused right now. You can still order for store pickup." });
  }
  const d = await resolveDistance(query, settings, { lat: null, lng: null, pincode });
  if (!d.ok) {
    const message = d.code === "pincode_not_served" ? `Sorry, we don't deliver to ${pincode} yet.` : `We couldn't confirm ${pincode}. Add your address at checkout or call us to check.`;
    return ok({ pincode, served: false, unknown: d.code === "location_unknown", pickup: settings.pickup.enabled, message });
  }
  const served = d.km <= settings.delivery.maxRadiusKm;
  return ok({
    pincode,
    area,
    served,
    km: Math.round(d.km * 10) / 10,
    pickup: settings.pickup.enabled,
    message: served ? `We deliver to ${area ? `${area}, ` : ""}${pincode}.` : `${pincode} is about ${Math.round(d.km)} km away — beyond our ${settings.delivery.maxRadiusKm} km delivery area.`,
  });
});
