"use client";

// 只取一个具体图标当类型样板（`typeof Camera` = Phosphor 图标组件类型）。
// 不从包根 barrel import 类型：`@phosphor-icons/react/dist/ssr` 未导出 `Icon`
// 类型别名，而走 barrel 会踩 bundle-barrel-imports（附录 B1）。
import type { Camera } from "@phosphor-icons/react/dist/ssr";

/**
 * FeatureCard - 共享特性卡（plan 001 §4-5）。
 *
 * 原先内联在 FeaturesBento.tsx 里，plan 001 抽成共享组件供
 * FeaturesBento（Craft 6 卡）与 SwingSection（Swing 4 卡）复用。
 * props 与原实现保持一致，行为零变化。
 *
 * tone：
 *   accent  强调卡（accent 底 + accent-fg 字）
 *   tinted  浅 tint 底（surface-tint）
 *   default 常规 elevated 底 + border
 */
export type FeatureCardTone = "accent" | "tinted" | "default";

export function FeatureCard({
  title,
  body,
  Icon: IconCmp,
  tone,
  span,
}: {
  title: string;
  body: string;
  Icon: typeof Camera;
  tone: FeatureCardTone;
  span?: string;
}) {
  const isAccent = tone === "accent";
  const isTinted = tone === "tinted";

  return (
    <article
      className={`relative p-7 rounded-[20px] min-h-[180px] flex flex-col gap-4 overflow-hidden ${span ?? ""}`}
      style={{
        background: isAccent
          ? "var(--color-accent)"
          : isTinted
          ? "var(--color-surface-tint)"
          : "var(--color-bg-elevated)",
        color: isAccent ? "var(--color-accent-fg)" : "var(--color-fg)",
        border: isAccent ? "none" : "1px solid var(--color-border)",
      }}
    >
      <div
        className="inline-flex items-center justify-center rounded-2xl"
        style={{
          width: 40,
          height: 40,
          background: isAccent
            ? "rgba(255,255,255,0.18)"
            : "var(--color-accent-soft)",
          color: isAccent ? "var(--color-accent-fg)" : "var(--color-fg)",
        }}
      >
        <IconCmp size={22} weight="regular" />
      </div>
      <h4 className="text-[20px] font-semibold leading-snug">{title}</h4>
      <p className="text-[14px] leading-relaxed max-w-[42ch]" style={{ opacity: 0.82 }}>
        {body}
      </p>
    </article>
  );
}
