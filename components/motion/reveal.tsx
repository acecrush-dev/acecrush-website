"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Reveal - Motion `whileInView` 隔离岛（skill §3.A 动效隔离）。
 * - 任何 MOTION_INTENSITY > 3 必须 honour prefers-reduced-motion
 * - 仅动 transform + opacity（§6.A）
 * - 不在 React state 里存动画进度
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const reduce = useReducedMotion();
  if (reduce) return <Tag className={className}>{children}</Tag>;

  const MotionTag = motion[Tag] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: 0.55,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </MotionTag>
  );
}

/** stagger 列表：用于 features 等多卡片组（v6h：改用 div，避免与子项自带 <li> 嵌套触发 hydration error） */
export function RevealStagger({
  items,
  className,
  itemClassName,
}: {
  items: ReactNode[];
  className?: string;
  itemClassName?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className={className}>
      {items.map((item, i) => (
        <motion.div
          key={i}
          className={itemClassName}
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{
            duration: 0.5,
            delay: i * 0.06,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {item}
        </motion.div>
      ))}
    </div>
  );
}
