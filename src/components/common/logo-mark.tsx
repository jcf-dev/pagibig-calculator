"use client";

import * as React from "react";
import { motion } from "framer-motion";

export function LogoMark({ className }: { className?: string }) {
  const [isAnimating, setIsAnimating] = React.useState(false);

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        className="absolute inset-0 z-0 rounded-md bg-gradient-to-br from-rose-500 to-blue-500"
        initial={{ opacity: 0, scale: 1 }}
        animate={isAnimating ? { opacity: [0.5, 0], scale: [1, 2.5] } : { opacity: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      <motion.div
        className="absolute inset-0 z-0 rounded-md bg-gradient-to-br from-rose-500 to-blue-500"
        initial={{ opacity: 0, scale: 1 }}
        animate={isAnimating ? { opacity: [0.5, 0], scale: [1, 2] } : { opacity: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
      />
      <motion.div
        className={`relative z-10 flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-md text-sm font-extrabold ${className ?? ""}`}
        onClick={() => setIsAnimating(true)}
        animate={
          isAnimating
            ? {
                rotate: [0, -20, 20, -20, 20, 0, 360],
                scale: [1, 1.1, 1.1, 1.1, 1.1, 1],
              }
            : {}
        }
        transition={{ duration: 1.5, ease: "easeInOut" }}
        onAnimationComplete={() => setIsAnimating(false)}
      >
        <div className="absolute inset-0 bg-primary" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-rose-500 to-blue-500"
          initial={{ opacity: 0 }}
          animate={isAnimating ? { opacity: [0, 1, 1, 0] } : { opacity: 0 }}
          transition={{ duration: 1.5, times: [0, 0.2, 0.8, 1] }}
        />
        <span className="relative z-10 text-primary-foreground">JF</span>
      </motion.div>
    </div>
  );
}
