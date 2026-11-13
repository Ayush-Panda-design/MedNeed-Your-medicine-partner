import { Droplet, FlaskConical, Pill, Stethoscope, Tag } from "lucide-react";
import type { Product } from "@/lib/data";

const tone: Record<string, string> = {
  "pain-relief": "from-rose-50 to-orange-100 text-rose-500",
  "cold-cough": "from-sky-50 to-cyan-100 text-sky-500",
  "diabetes-care": "from-indigo-50 to-blue-100 text-indigo-500",
  "heart-care": "from-red-50 to-rose-100 text-red-500",
  vitamins: "from-amber-50 to-yellow-100 text-amber-500",
  "digestive-care": "from-emerald-50 to-green-100 text-emerald-500",
  "skin-care": "from-fuchsia-50 to-pink-100 text-fuchsia-500",
  "baby-care": "from-violet-50 to-purple-100 text-violet-500",
  "womens-care": "from-pink-50 to-rose-100 text-pink-500",
  devices: "from-slate-50 to-slate-200 text-slate-500",
};

function iconFor(form: Product["form"]) {
  switch (form) {
    case "Syrup":
    case "Spray":
    case "Drops":
      return FlaskConical;
    case "Device":
      return Stethoscope;
    case "Capsule":
    case "Sachet":
      return Pill;
    case "Cream":
    case "Gel":
      return Droplet;
    default:
      return Pill;
  }
}

// Placeholder artwork until real product photos are uploaded (Phase 3).
export function ProductVisual({ product, className = "" }: { product: Product; className?: string }) {
  const Icon = iconFor(product.form) ?? Tag;
  return (
    <div className={`grid place-items-center bg-gradient-to-br ${tone[product.category] ?? tone.devices} ${className}`}>
      <Icon className="h-1/3 w-1/3" strokeWidth={1.5} />
    </div>
  );
}
