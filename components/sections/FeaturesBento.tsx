"use client";

import {
  BellRinging,
  Calculator,
  Camera,
  FirstAidKit,
  Ruler,
  TennisBall,
} from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/motion/reveal";

/**
 * Features - 6 项不对称 bento（plan §4.7 BENTO CELL COUNT RULE：6 项 → 6 格）。
 * 桌面 3 列 2 行；第二行第一格占 2 列宽。
 * accent：第一张 card 用科技绿（item1 is accent tone）；
 * 第五张 card（球拍档案）用 surface-tint 浅绿做差异化背景（tinted tone）。
 */
const ICONS = {
  item1: Camera,
  item2: Ruler,
  item3: BellRinging,
  item4: Calculator,
  item5: TennisBall,
  item6: FirstAidKit,
} as const;

const TONES = ["accent", "default", "default", "default", "tinted", "default"] as const;

export function FeaturesBento() {
  const t = useTranslations("features");
  const items = [
    { titleKey: "item1Title", bodyKey: "item1Body" },
    { titleKey: "item2Title", bodyKey: "item2Body" },
    { titleKey: "item3Title", bodyKey: "item3Body" },
    { titleKey: "item4Title", bodyKey: "item4Body" },
    { titleKey: "item5Title", bodyKey: "item5Body" },
    { titleKey: "item6Title", bodyKey: "item6Body" },
  ] as const;

  return (
    <section
      id="features"
      className="container-x py-20 lg:py-28"
      aria-labelledby="features-heading"
    >
      <Reveal>
        <h2
          id="features-heading"
          className="text-[32px] md:text-[44px] leading-[1.1] tracking-tight font-semibold max-w-[20ch]"
          style={{ color: "var(--color-fg)" }}
        >
          {t("heading")}
        </h2>
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
        {items.map((it, i) => (
          <FeatureCard
            key={i}
            title={t(it.titleKey)}
            body={t(it.bodyKey)}
            Icon={ICONS[`item${i + 1}` as keyof typeof ICONS]}
            tone={TONES[i]}
            span={i === 4 ? "lg:col-span-2" : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({
  title,
  body,
  Icon,
  tone,
  span,
}: {
  title: string;
  body: string;
  Icon: typeof Camera;
  tone: "accent" | "tinted" | "default";
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
        <Icon size={22} weight="regular" />
      </div>
      <h3 className="text-[20px] font-semibold leading-snug">{title}</h3>
      <p className="text-[14px] leading-relaxed max-w-[42ch]" style={{ opacity: 0.82 }}>
        {body}
      </p>
    </article>
  );
}