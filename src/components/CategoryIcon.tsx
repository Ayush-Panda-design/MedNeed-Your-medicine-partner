import {
  Activity,
  Baby,
  Brain,
  Droplet,
  Eye,
  Flower2,
  HeartPulse,
  Leaf,
  Pill,
  ShieldPlus,
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
  shield: ShieldPlus,
  brain: Brain,
  eye: Eye,
  activity: Activity,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Pill;
  return <Icon className={className} />;
}
