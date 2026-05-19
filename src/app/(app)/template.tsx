"use client";

import { motion } from "framer-motion";

/**
 * Template do Next.js: re-renderiza em toda navegação (diferente de layout).
 * Aplica fade sutil entre páginas autenticadas.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
