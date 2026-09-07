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
import { TennisBallGlobe } from "@/components/brand/TennisBallGlobe";

/**
 * BrandHero - 品牌级 hero（plan 001 §4-3 + plan 002 用户追加 2026-09-07）。
 *
 * 从「AceCrush Craft 单产品落地页」升级为品牌站后，首屏承载品牌叙事：
 *   h1 品牌 headline + subtext + 两张产品简介卡（Craft / Swing Analysis）。
 *
 * 用户 2026-09-07 调整：
 *   - TennisBallGlobe canvas 改为**全宽 + 大高度**（full page width，height ≈640），
 *     把整段品牌文案（eyebrow / h1 / subtext）**叠加在 canvas 上半部**，
 *     产品卡放在 canvas 下方。这样 3D 空间的高度"包含"上面的文字，
 *     同时 hero 区不再是「文案 → 小球 → 产品卡」三段式，而是「3D 中心 + 产品卡」。
 *   - 文字叠加在深色 canvas 上时，必须用浅色（不依赖站点 light/dark token）。
 *
 * 排布刻意不对称（skill §4.3 ANTI-CENTER BIAS）：
 *   文字左对齐 max-w-3xl；产品卡 grid 左宽右窄。
 */
const CRAFT_DOCS = "https://acecrush-dev.github.io/acecrush-craft-app/";
const SWING_DOCS = "https://acecrush-dev.github.io/swing-analysis-app/";
const GLOBE_HEIGHT = 760;

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

export function BrandHero() {
  const t = useTranslations("brandHero");
  const tCraft = useTranslations("products.craft");
  const tSwing = useTranslations("products.swing");

  // 文字叠加在深色 canvas 上：用米白 / 浅米色，不依赖站点 light/dark token
  const FG_HERO = "#f5f1d8";
  const FG_HERO_MUTED = "rgba(245,240,200,0.78)";
  const FG_HERO_SUBTLE = "rgba(245,240,200,0.55)";

  return (
    <section aria-labelledby="brand-headline">
      {/* 3D 中心：full page width。
          高度响应式：桌面 ~720px，平板 ~560px，手机 ~ min(72vw, 520)px。
          这样窄屏 canvas 不会过高，避免文字 + 球 + 产品卡挤在一起。
          文字 absolute overlay 在 canvas 上半部（左对齐），
          pointer-events-none 让 OrbitControls / marker hover 仍能命中 canvas。 */}
      <div
        className="relative w-full"
        style={{ height: "min(72vw, 720px)", minHeight: 480 }}
      >
        <TennisBallGlobe
          ariaLabel={`${tCraft("name")} + ${tSwing("name")} ecosystem`}
          height="100%"
        />

        <div
          className="absolute inset-x-0 top-0 z-10 pointer-events-none"
          style={{ paddingTop: 32 }}
        >
          <div className="container-x">
            <div
              className="pointer-events-auto"
              style={{ maxWidth: "min(72vw, 540px)" }}
            >
              <Reveal>
                <p className="eyebrow" style={{ color: FG_HERO_SUBTLE }}>
                  {t("eyebrow")}
                </p>
              </Reveal>
              <Reveal delay={0.08}>
                <h1
                  id="brand-headline"
                  className="mt-5 text-[40px] md:text-[52px] lg:text-[64px] leading-[1.03] tracking-tighter font-extrabold"
                  style={{ color: FG_HERO, maxWidth: "16ch" }}
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
                  className="mt-6 text-[15px] md:text-[16px] leading-relaxed"
                  style={{ color: FG_HERO_MUTED, maxWidth: "48ch" }}
                >
                  {t("subtext")}
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </div>

      {/* 产品卡在 canvas 下方 */}
      <div className="container-x pt-12 pb-16 lg:pb-20">
        {/* 两张产品卡：桌面左宽右窄，移动端单列堆叠 */}
        <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr] items-stretch">
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
