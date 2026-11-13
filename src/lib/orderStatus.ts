// Client-safe labels for order states.
export const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Waiting for payment", confirmed: "Confirmed", packed: "Packed", out_for_delivery: "Out for delivery",
  delivered: "Delivered", cancelled: "Cancelled", expired: "Expired",
};
export const STATUS_STYLE: Record<string, string> = {
  pending_payment: "bg-amber-50 text-amber-800", confirmed: "bg-sky-50 text-sky-800", packed: "bg-indigo-50 text-indigo-800",
  out_for_delivery: "bg-violet-50 text-violet-800", delivered: "bg-emerald-50 text-emerald-800", cancelled: "bg-rose-50 text-rose-800", expired: "bg-slate-100 text-slate-700",
};
export const PAYMENT_LABEL: Record<string, string> = { cod: "Pay on delivery", pay_at_store: "Pay at the store", online: "Online payment" };
export const slotText = (date: string | null, window: string | null) => (date && window ? `${new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}, ${window.replace("-", " – ")}` : "As soon as possible");
export const dateTime = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** What the customer sees. A packed pickup order is "ready for pickup", and a delivered pickup order was "collected". */
export const labelFor = (status: string, fulfilment: string) =>
  fulfilment === "pickup" ? ({ packed: "Ready for pickup", delivered: "Collected" } as Record<string, string>)[status] ?? STATUS_LABEL[status] ?? status : STATUS_LABEL[status] ?? status;

/** The steps shown on the tracking bar, in order. */
export const TRACK_STEPS = (fulfilment: string) =>
  fulfilment === "pickup"
    ? [{ key: "confirmed", label: "Confirmed" }, { key: "packed", label: "Ready for pickup" }, { key: "delivered", label: "Collected" }]
    : [{ key: "confirmed", label: "Confirmed" }, { key: "packed", label: "Packed" }, { key: "out_for_delivery", label: "On the way" }, { key: "delivered", label: "Delivered" }];

export const FAIL_REASON_LABEL: Record<string, string> = { not_reachable: "Customer not reachable", wrong_address: "Address could not be found", refused: "Customer refused the order", not_home: "Nobody was available", other: "Other" };
