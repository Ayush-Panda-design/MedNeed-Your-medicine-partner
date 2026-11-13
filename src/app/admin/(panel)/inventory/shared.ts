export const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
export const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const prettyDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export const STATE_LABEL: Record<string, { text: string; cls: string }> = {
  expired: { text: "Expired", cls: "bg-rose-100 text-rose-800" },
  short_dated: { text: "Too close to expiry to sell", cls: "bg-orange-100 text-orange-800" },
  near_expiry: { text: "Near expiry", cls: "bg-amber-100 text-amber-800" },
  ok: { text: "OK", cls: "bg-emerald-100 text-emerald-800" },
};
export const KIND_LABEL: Record<string, string> = {
  purchase: "Purchase", opening: "Opening balance", sale: "Sale", sale_return: "Sale returned", damage: "Damaged", expired: "Expired / written off",
  correction: "Count correction", supplier_return: "Returned to supplier",
};
