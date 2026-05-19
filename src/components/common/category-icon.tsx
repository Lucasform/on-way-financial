import {
  Banknote,
  Briefcase,
  Bus,
  Car,
  CircleEllipsis,
  Clapperboard,
  Coffee,
  CreditCard,
  Dumbbell,
  Fuel,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  LucideIcon,
  PartyPopper,
  PawPrint,
  Pill,
  Plane,
  Plug,
  Repeat,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Mapeia nomes de ícones do lucide-react (string salva no DB) para o componente.
 * Caso o nome não exista, devolvemos um fallback decente.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  "utensils-crossed": UtensilsCrossed,
  "shopping-cart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  car: Car,
  bus: Bus,
  fuel: Fuel,
  home: Home,
  "heart-pulse": HeartPulse,
  stethoscope: Stethoscope,
  pill: Pill,
  "party-popper": PartyPopper,
  clapperboard: Clapperboard,
  coffee: Coffee,
  "graduation-cap": GraduationCap,
  laptop: Laptop,
  repeat: Repeat,
  shirt: Shirt,
  "paw-print": PawPrint,
  landmark: Landmark,
  briefcase: Briefcase,
  wallet: Wallet,
  banknote: Banknote,
  "trending-up": TrendingUp,
  plane: Plane,
  dumbbell: Dumbbell,
  sparkles: Sparkles,
  plug: Plug,
  zap: Zap,
  wrench: Wrench,
  "credit-card": CreditCard,
  "circle-ellipsis": CircleEllipsis,
};

interface CategoryIconProps {
  icon?: string | null;
  color?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { box: "h-8 w-8", icon: "h-4 w-4" },
  md: { box: "h-10 w-10", icon: "h-5 w-5" },
  lg: { box: "h-12 w-12", icon: "h-6 w-6" },
};

export function CategoryIcon({ icon, color, size = "md", className }: CategoryIconProps) {
  const Icon: LucideIcon = (icon && ICON_MAP[icon]) || CircleEllipsis;
  const tone = color ?? "#9CA3AF";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-full ring-1 ring-inset",
        SIZES[size].box,
        className,
      )}
      style={{
        backgroundColor: `${tone}1a`,
        color: tone,
        boxShadow: `inset 0 0 0 1px ${tone}33`,
      }}
    >
      <Icon className={SIZES[size].icon} strokeWidth={2.2} />
    </span>
  );
}
