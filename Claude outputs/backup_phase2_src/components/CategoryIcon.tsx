import {
  Baby,
  Droplet,
  Flower2,
  HeartPulse,
  Leaf,
  Pill,
  Sparkles,
  Stethoscope,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  pill: Pill,
  wind: Wind,
  droplet: Droplet,
  "heart-pulse": HeartPulse,
  sparkles: Sparkles,
  stomach: Leaf,
  sun: Sun,
  baby: Baby,
  flower: Flower2,
  stethoscope: Stethoscope,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Pill;
  return <Icon className={className} />;
}
