/** Builds a click-to-chat link (https://wa.me/<number>?text=...). Returns null when the shop number is missing or not a usable Indian number. */
export function whatsappLink(phone: string | undefined | null, message: string): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length !== 12 || !digits.startsWith("91")) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
