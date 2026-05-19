"use client";

import { motion, type MotionProps } from "framer-motion";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

interface FadeInProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** "up" = vem de baixo (default); "none" = sem deslocamento */
  from?: "up" | "down" | "none";
}

/**
 * Wrapper genérico pra fade-in com slide-up sutil.
 * Respeita prefers-reduced-motion automaticamente via framer.
 */
export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, className, delay = 0, from = "up", ...props }, ref) => {
    const y = from === "up" ? 8 : from === "down" ? -8 : 0;
    return (
      <motion.div
        ref={ref}
        className={className}
        initial={{ opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay, ease: [0.2, 0.65, 0.3, 1] }}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
FadeIn.displayName = "FadeIn";

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  gap?: number; // ms entre filhos
}

export function Stagger({ children, className, gap = 60 }: StaggerProps) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <div className={cn(className)}>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: (i * gap) / 1000, ease: "easeOut" }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
