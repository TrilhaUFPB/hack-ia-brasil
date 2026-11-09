"use client";

import { motion } from "motion/react";

/**
 * One of the official Trilha stickers (marca/adesivos), slapped on the page at a
 * tilt. It can be peeled off and dragged around; let go and it springs back.
 */
export function Sticker({
  src,
  alt,
  width,
  rotate,
  className = "",
}: {
  src: string;
  alt: string;
  width: number;
  rotate: number;
  className?: string;
}) {
  return (
    <motion.img
      src={src}
      alt={alt}
      width={width}
      draggable={false}
      className={`pointer-events-auto absolute z-20 h-auto cursor-grab select-none drop-shadow-[0_6px_14px_rgba(0,0,0,0.45)] active:cursor-grabbing ${className}`}
      style={{ width }}
      initial={{ opacity: 0, scale: 1.25, rotate: rotate - 12 }}
      whileInView={{ opacity: 1, scale: 1, rotate }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      whileHover={{ scale: 1.06, rotate: rotate + 4 }}
      whileTap={{ scale: 1.1 }}
      drag
      dragSnapToOrigin
      dragElastic={0.6}
      onPointerDown={(e) => e.stopPropagation()}
    />
  );
}
