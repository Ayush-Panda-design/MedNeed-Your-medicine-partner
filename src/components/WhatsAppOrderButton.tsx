import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/whatsapp";

/** Opens WhatsApp with a ready-to-send message to the shop. Renders nothing when the shop number is not set. */
export function WhatsAppOrderButton({ phone, message, label = "Order on WhatsApp", className = "" }: { phone?: string | null; message: string; label?: string; className?: string }) {
  const href = whatsappLink(phone, message);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${className}`}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" /> {label}
    </a>
  );
}
