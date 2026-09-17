"use client";

import {
  BellRinging,
  Calculator,
  ChalkboardTeacher,
  CloudArrowDown,
  Ruler,
  TennisBall,
} from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/motion/reveal";
import { FeatureCard, type FeatureCardTone } from "@/components/sections/FeatureCard";

/**
 * Features - AceCrush Craft 特性网格。
 *
 * plan 001 §4-7：
 *   - FeatureCard 抽到 components/sections/FeatureCard.tsx 共享（SwingSection 复用）
 *   - 文案 key 由 `features.*` 改为 `products.craft.features.*`
 *   - ICONS / TONES / ITEMS 全部提升为模块级常量（rerender 卫生）
 *   - heading 降为 h3（页面 h1 = BrandHero，h2 = CraftHero 产品头）
 *
 * 用户 2026-09-05 追加调整：
 *   - 删除「伤病提示 / Injury awareness」卡（原 item6），6 项 → 5 项
 *   - 「球拍档案 / Racket profiles」提到第 3 位，key 顺序随展示顺序重排
 *   - 所有卡片等宽：移除原 item5 的 `lg:col-span-2`（那正是「第五个拉太长」的原因）
 *   - 3 列 × 2 行 = 6 格，5 张卡后最后一格**留空**（grid 自然空位，
 *     不渲染任何占位元素），不再用 CTA 之类的东西填。
 *
 * 用户 2026-09-18 追加调整：
 *   - item1 + item2（原 AI 测 + 手工测）合并为单卡「Grip size measurement」，
 *     文案内同时描述 AI 测与手工测两条路径，内容二合一
 *   - 末尾新增两块：「Tactical board 战术板」、「Private data sync 私人数据同步」
 *   - 6 项满铺 3 × 2 grid，无需再留空
 */
const ICONS = [Ruler, TennisBall, BellRinging, Calculator, ChalkboardTeacher, CloudArrowDown] as const;

const TONES: readonly FeatureCardTone[] = [
  "accent",
  "tinted",
  "default",
  "default",
  "default",
  "default",
];

const ITEMS = [
  { titleKey: "item1Title", bodyKey: "item1Body" },
  { titleKey: "item2Title", bodyKey: "item2Body" },
  { titleKey: "item3Title", bodyKey: "item3Body" },
  { titleKey: "item4Title", bodyKey: "item4Body" },
  { titleKey: "item5Title", bodyKey: "item5Body" },
  { titleKey: "item6Title", bodyKey: "item6Body" },
] as const;

export function FeaturesBento() {
  const t = useTranslations("products.craft.features");

  return (
    <section
      id="features"
      className="container-x py-28 lg:py-44"
      aria-labelledby="features-heading"
    >
      <Reveal>
        <h3
          id="features-heading"
          className="text-[32px] md:text-[44px] leading-[1.1] tracking-tight font-semibold max-w-[20ch]"
          style={{ color: "var(--color-fg)" }}
        >
          {t("heading")}
        </h3>
      </Reveal>
      <Reveal delay={0.08}>
        <p
          className="mt-3 max-w-[58ch] text-[15px]"
          style={{ color: "var(--color-fg-muted)" }}
        >
          {t("subheading")}
        </p>
      </Reveal>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((it, i) => (
          <FeatureCard
            key={it.titleKey}
            title={t(it.titleKey)}
            body={t(it.bodyKey)}
            Icon={ICONS[i]}
            tone={TONES[i]}
          />
        ))}
      </div>
    </section>
  );
}
