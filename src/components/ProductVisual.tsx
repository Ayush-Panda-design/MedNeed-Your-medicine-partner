import { Activity, Apple, Baby, Bandage, Droplet, FlaskConical, Flower2, HeartPulse, Package, Pill, ShieldCheck, Smile, SprayCan, Sparkles, Syringe, TestTube, Thermometer, Wind, type LucideIcon } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { Packshot, kindFor, type PackKind } from "./Packshot";

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
  "personal-care": "from-teal-50 to-emerald-100 text-teal-500",
  "ayurvedic-herbal": "from-lime-50 to-green-100 text-lime-600",
  nutrition: "from-amber-50 to-orange-100 text-amber-600",
  "sexual-wellness": "from-rose-50 to-pink-100 text-rose-500",
  devices: "from-slate-50 to-slate-200 text-slate-500",
};

// Same decision as the large picture (Packshot), so the small search tile never shows a pill for a diaper.
const ICONS: Record<PackKind, LucideIcon> = {
  tablet: Pill, capsule: Pill, syrup: FlaskConical, bottle: FlaskConical, dropper: Droplet, tube: Droplet, toothpaste: Smile, condom: ShieldCheck,
  diaper: Baby, pad: Flower2, glucometer: Activity, strips: Droplet, thermometer: Thermometer, bpmonitor: HeartPulse, bandage: Bandage, soap: Sparkles,
  pump: SprayCan, inhaler: Wind, vial: Syringe, jar: Apple, sachet: Package, pregtest: TestTube, box: Package,
};

// Shows the uploaded product photo, or placeholder artwork until one is uploaded.
export function ProductVisual({ product, className = "", art = "packshot" }: { product: Pick<Product, "category" | "form" | "imageUrl" | "name"> & { slug?: string }; className?: string; art?: "packshot" | "icon" }) {
  if (product.imageUrl) {
    return (
      <div className={`mn-photo grid place-items-center overflow-hidden bg-white ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain p-3" />
      </div>
    );
  }
  if (art === "packshot") return <Packshot name={product.name} form={product.form} category={product.category} seed={product.slug ?? product.name} className={className} />;
  const Icon = ICONS[kindFor({ name: product.name, form: product.form, category: product.category })];
  return (
    <div className={`mn-tile grid place-items-center bg-gradient-to-br ${tone[product.category] ?? tone.devices} ${className}`}>
      <Icon className="h-1/3 w-1/3" strokeWidth={1.5} />
    </div>
  );
}
