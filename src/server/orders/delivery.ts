import type { Q } from "../db";
import type { StoreSettings } from "./settings";

const R = 6371; // km
const rad = (d: number) => (d * Math.PI) / 180;

/** Straight-line distance between two points, in km. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type Place = { lat: number | null; lng: number | null; pincode: string };
export type Distance =
  | { ok: true; km: number; source: "pin" | "pincode" }
  | { ok: false; code: "pincode_not_served" | "location_unknown"; message: string };

/**
 * Distance from the shop to the customer.
 * - An exact pin (shared location) is used when there is one.
 * - Otherwise the centre of the pincode is used.
 * - If the pin and the pincode centre disagree by more than 8 km, the larger distance is used, so a pin that does
 *   not match the written address cannot be used to get a lower fee.
 */
export async function resolveDistance(q: Q, settings: StoreSettings, place: Place): Promise<Distance> {
  const shop = settings.shop;
  const row = (await q<{ lat: string; lng: string; is_active: boolean }>(`select lat, lng, is_active from service_pincodes where pincode = $1`, [place.pincode]))[0];
  if (row && !row.is_active) return { ok: false, code: "pincode_not_served", message: `We do not deliver to pincode ${place.pincode}.` };
  const pin = place.lat != null && place.lng != null ? haversineKm(shop, { lat: place.lat, lng: place.lng }) : null;
  const centre = row ? haversineKm(shop, { lat: Number(row.lat), lng: Number(row.lng) }) : null;
  if (pin == null && centre == null) {
    return { ok: false, code: "location_unknown", message: "We could not work out the distance to this address. Share your location on the address, or call us to place the order." };
  }
  if (pin != null && centre != null) {
    const apart = haversineKm({ lat: place.lat as number, lng: place.lng as number }, { lat: Number(row!.lat), lng: Number(row!.lng) });
    if (apart > 8) return { ok: true, km: Math.round(Math.max(pin, centre) * 100) / 100, source: "pincode" };
  }
  return pin != null ? { ok: true, km: Math.round(pin * 100) / 100, source: "pin" } : { ok: true, km: Math.round((centre as number) * 100) / 100, source: "pincode" };
}

export type DeliveryCharge = { ok: true; fee: number; baseFee: number; distanceFee: number } | { ok: false; code: "too_far" | "below_minimum" | "disabled"; message: string };

const rupees = (n: number) => `₹${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** Fee for a delivery of `subtotal` rupees of goods over `km`. Fee rules are all in the store settings. */
export function deliveryCharge(settings: StoreSettings, subtotal: number, km: number): DeliveryCharge {
  const d = settings.delivery;
  if (!d.enabled) return { ok: false, code: "disabled", message: "Home delivery is not available right now." };
  if (km > d.maxRadiusKm) return { ok: false, code: "too_far", message: `This address is about ${km} km away. We deliver up to ${d.maxRadiusKm} km.` };
  if (subtotal < d.minOrder) return { ok: false, code: "below_minimum", message: `The minimum order for home delivery is ${rupees(d.minOrder)}. Add ${rupees(Math.ceil((d.minOrder - subtotal) * 100) / 100)} more, or choose store pickup.` };
  const band = d.feeBands.find((b) => subtotal < b.below);
  const baseFee = band ? band.fee : 0;
  const extraKm = Math.max(0, Math.ceil(km - d.freeRadiusKm));
  const distanceFee = Math.round(extraKm * d.perKmRate * 100) / 100;
  return { ok: true, fee: Math.round((baseFee + distanceFee) * 100) / 100, baseFee, distanceFee };
}
