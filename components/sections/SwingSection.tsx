"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ArrowUpRight,
  FilmStrip,
  Lightning,
  PersonSimpleRun,
} from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/motion/reveal";
import { FeatureCard, type FeatureCardTone } from "@/components/sections/FeatureCard";

/**
 * SwingSection - Swing Analysis 产品区（plan 001 §4-6）。
 *
 * 结构与 Craft 区同族但刻意不同构（skill §4.7 不同 layout family）：
 *   产品头（h2 + tagline）+ intro 段落 + **clip_play.png 桌面截图** +
 *   「Built for frame-level review.」h3 + 3 张共享 FeatureCard（一行铺满）。
 * 首卡 accent tone 做视觉锚点。
 *
 * 用户 2026-09-05 追加：删除「原生 seek，前端可插拔」卡（原 item4），
 *   理由是产品实际没有原生 seek 这回事，不能写进卖点；4 项 → 3 项，
 *   同时移除原第 3 卡的 `lg:col-span-2`，三卡等宽正好占满一行。
 *
 * 用户 2026-09-11 追加：插入真实桌面端 clip_play.png 截图（来自
 *   swing-analysis/docs），让产品区有视觉证据（之前 TODO-assets.md
 *   「Swing 截图/GIF」一直空缺）。截图放在 intro 段后、features 头前，
 *   桌面端最大宽度与 feature grid 一致；移动端 16:9 自适应。
 *
 * 下载 CTA 指向 /#download（Swing 目前无 release，实际下载区只给
 * 文档与 Releases 外链，不放死链主按钮）。
 */
const ICONS = [FilmStrip, Lightning, PersonSimpleRun] as const;
const TONES: readonly FeatureCardTone[] = ["accent", "default", "tinted"];
const ITEMS = [
  { titleKey: "item1Title", bodyKey: "item1Body" },
  { titleKey: "item2Title", bodyKey: "item2Body" },
  { titleKey: "item3Title", bodyKey: "item3Body" },
] as const;

const SWING_DOCS = "https://acecrush-dev.github.io/swing-analysis-app/";

export function SwingSection() {
  const t = useTranslations("products.swing");
  const tIntro = useTranslations("products.swing.intro");
  const tFeat = useTranslations("products.swing.features");

  return (
    <section
      id="swing"
      className="container-x py-20 lg:py-28"
      aria-labelledby="swing-headline"
    >
      <Reveal>
        <p className="eyebrow">{tIntro("eyebrow")}</p>
      </Reveal>
      <Reveal delay={0.06}>
        <h2
          id="swing-headline"
          className="mt-4 text-[36px] md:text-[50px] lg:text-[60px] leading-[1.05] tracking-tighter font-extrabold font-display max-w-[18ch]"
          style={{ color: "var(--color-fg)" }}
        >
          {tIntro("headline")}
        </h2>
      </Reveal>
      <Reveal delay={0.12}>
        <p className="mt-3 text-[15px] font-medium" style={{ color: "var(--color-fg-subtle)" }}>
          {t("name")} · {t("tagline")}
        </p>
      </Reveal>
      <Reveal delay={0.18}>
        <p
          className="mt-5 max-w-[62ch] text-[16px] md:text-[17px] leading-relaxed"
          style={{ color: "var(--color-fg-muted)" }}
        >
          {tIntro("subtext")}
        </p>
      </Reveal>

      {/* 用户 2026-09-11：插入桌面端真实截图（clip_play.png），给产品区视觉证据 */}
      <Reveal delay={0.22}>
        <figure className="mt-10">
          <div
            className="overflow-hidden rounded-2xl"
            style={{
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-tint)",
              boxShadow: "0 20px 60px -28px rgba(0,0,0,0.35)",
            }}
          >
            <img
              src="/img/swing/clip_play.png"
              alt={tIntro("previewLabel")}
              width={1437}
              height={1043}
              loading="lazy"
              decoding="async"
              className="block w-full h-auto"
            />
          </div>
          <figcaption
            className="sr-only"
            style={{ color: "var(--color-fg-subtle)" }}
          >
            {tIntro("previewLabel")}
          </figcaption>
        </figure>
      </Reveal>

      <Reveal delay={0.28}>
        <h3
          className="mt-16 text-[26px] md:text-[34px] leading-[1.15] tracking-tight font-semibold max-w-[20ch]"
          style={{ color: "var(--color-fg)" }}
        >
          {tFeat("heading")}
        </h3>
      </Reveal>
      <Reveal delay={0.32}>
        <p className="mt-3 max-w-[58ch] text-[15px]" style={{ color: "var(--color-fg-muted)" }}>
          {tFeat("subheading")}
        </p>
      </Reveal>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((it, i) => (
          <FeatureCard
            key={it.titleKey}
            title={tFeat(it.titleKey)}
            body={tFeat(it.bodyKey)}
            Icon={ICONS[i]}
            tone={TONES[i]}
          />
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link href="/#download" className="btn-primary">
          {tIntro("downloadCta")}
          <ArrowRight size={16} weight="bold" aria-hidden />
        </Link>
        <a
          href={SWING_DOCS}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost"
          aria-label={`${tIntro("docsCta")} (${t("name")})`}
        >
          {tIntro("docsCta")}
          <ArrowUpRight size={15} weight="bold" aria-hidden />
        </a>
      </div>
    </section>
  );
}
