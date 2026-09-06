"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  AndroidLogo,
  ArrowRight,
  ArrowUpRight,
  Monitor,
} from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/motion/reveal";

/**
 * BrandHero - 品牌级 hero（plan 001 §4-3）。
 *
 * 从「AceCrush Craft 单产品落地页」升级为品牌站后，首屏承载品牌叙事：
 *   h1 品牌 headline + subtext + 两张产品简介卡（Craft / Swing Analysis）。
 *
 * 排布刻意不对称（skill §4.3 ANTI-CENTER BIAS）：桌面两列但左卡略宽
 * （1.05fr / 1fr），Craft 卡用 accent-soft 底、Swing 卡用 elevated 底，
 * 避免等宽同色的均质三卡观感。
 *
 * 每张卡：tag（平台类型）+ 产品名 + body + 平台徽标 +
 *   主 CTA（站内锚点 /#craft、/#swing）+ 次级「文档 ↗」外链。
 */
const CRAFT_DOCS = "https://acecrush-dev.github.io/acecrush-craft-app/";
const SWING_DOCS = "https://acecrush-dev.github.io/swing-analysis-app/";

export function BrandHero() {
  const t = useTranslations("brandHero");
  const tCraft = useTranslations("products.craft");
  const tSwing = useTranslations("products.swing");

  return (
    <section
      className="pt-16 lg:pt-24 pb-16 lg:pb-20"
      aria-labelledby="brand-headline"
    >
      <div className="container-x">
        <Reveal>
          <p className="eyebrow">{t("eyebrow")}</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1
            id="brand-headline"
            className="mt-5 text-[44px] md:text-[60px] lg:text-[76px] leading-[1.03] tracking-tighter font-extrabold max-w-[18ch]"
            style={{ color: "var(--color-fg)" }}
          >
            {t("headline")
              .split("\n")
              .map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p
            className="mt-6 max-w-[62ch] text-[16px] md:text-[17px] leading-relaxed"
            style={{ color: "var(--color-fg-muted)" }}
          >
            {t("subtext")}
          </p>
        </Reveal>

        {/* 两张产品卡：桌面左宽右窄，移动端单列堆叠 */}
        <div className="mt-14 grid gap-5 lg:grid-cols-[1.05fr_1fr] items-stretch">
          <Reveal delay={0.22} className="h-full">
            <ProductCard
              tag={t("craftCardTag")}
              name={tCraft("name")}
              tagline={tCraft("tagline")}
              body={t("craftCardBody")}
              platform={t("craftCardPlatform")}
              PlatformIcon={AndroidLogo}
              ctaHref="/#craft"
              ctaLabel={tCraft("name")}
              docsHref={CRAFT_DOCS}
              docsLabel={t("docsLink")}
              tinted
            />
          </Reveal>
          <Reveal delay={0.3} className="h-full">
            <ProductCard
              tag={t("swingCardTag")}
              name={tSwing("name")}
              tagline={tSwing("tagline")}
              body={t("swingCardBody")}
              platform={t("swingCardPlatform")}
              PlatformIcon={Monitor}
              ctaHref="/#swing"
              ctaLabel={tSwing("name")}
              docsHref={SWING_DOCS}
              docsLabel={t("docsLink")}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  tag,
  name,
  tagline,
  body,
  platform,
  PlatformIcon,
  ctaHref,
  ctaLabel,
  docsHref,
  docsLabel,
  tinted = false,
}: {
  tag: string;
  name: string;
  tagline: string;
  body: string;
  platform: string;
  PlatformIcon: typeof AndroidLogo;
  ctaHref: string;
  ctaLabel: string;
  docsHref: string;
  docsLabel: string;
  tinted?: boolean;
}) {
  return (
    <article
      className="card-elevated h-full p-7 md:p-9 flex flex-col gap-4"
      style={{
        background: tinted
          ? "var(--color-surface-tint)"
          : "var(--color-bg-elevated)",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="eyebrow">{tag}</span>
        <span
          className="inline-flex items-center gap-1.5 text-[12px]"
          style={{ color: "var(--color-fg-subtle)" }}
        >
          <PlatformIcon size={14} weight="regular" aria-hidden />
          {platform}
        </span>
      </div>

      <div>
        <h2
          className="text-[26px] md:text-[30px] font-semibold tracking-tight leading-snug"
          style={{ color: "var(--color-fg)" }}
        >
          {name}
        </h2>
        <p className="mt-1 text-[14px]" style={{ color: "var(--color-fg-subtle)" }}>
          {tagline}
        </p>
      </div>

      <p
        className="text-[15px] leading-relaxed max-w-[46ch]"
        style={{ color: "var(--color-fg-muted)" }}
      >
        {body}
      </p>

      <div className="mt-auto pt-4 flex flex-wrap items-center gap-3">
        <Link href={ctaHref} className="btn-primary">
          {ctaLabel}
          <ArrowRight size={16} weight="bold" aria-hidden />
        </Link>
        <a
          href={docsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost"
          aria-label={`${docsLabel} (${ctaLabel})`}
        >
          {docsLabel}
          <ArrowUpRight size={15} weight="bold" aria-hidden />
        </a>
      </div>
    </article>
  );
}
