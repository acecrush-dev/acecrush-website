"use client";

import { ArrowRight, Camera } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";

/**
 * CraftHero - AceCrush Craft 产品区首屏（plan 001 §4-4）。
 *
 * 由旧 HeroSection.tsx 改名搬家而来：
 *   - 页面 h1 已上移到 BrandHero（品牌级），这里降为 h2 产品头
 *   - 文案 key 从 `hero.*` 改读 `products.craft.intro.*`
 *   - section id="craft"，供 nav 与 BrandHero 产品卡锚点跳转
 *
 * 布局与动效保持原样：左文案 + 右手机框真渲染测量结果卡
 * （skill §4.8 Hero needs a real visual，不是 div 假截图）。
 */
export function CraftHero() {
  const t = useTranslations("products.craft.intro");
  const tCraft = useTranslations("products.craft");
  return (
    <section
      id="craft"
      className="pt-16 lg:pt-20 pb-16"
      aria-labelledby="craft-headline"
    >
      <div className="container-x grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] items-center gap-12 lg:gap-16">
        {/* 左：文案 */}
        <div>
          <Reveal>
            <p className="eyebrow">{t("eyebrow")}</p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2
              id="craft-headline"
              className="mt-4 text-[40px] md:text-[54px] lg:text-[68px] leading-[1.04] tracking-tighter font-extrabold font-display"
              style={{ color: "var(--color-fg)" }}
            >
              {t("headline")
                .split("\n")
                .map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p
              className="mt-3 text-[15px] font-medium"
              style={{ color: "var(--color-fg-subtle)" }}
            >
              {tCraft("name")} · {tCraft("tagline")}
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <p
              className="mt-5 max-w-[58ch] text-[16px] md:text-[17px] leading-relaxed"
              style={{ color: "var(--color-fg-muted)" }}
            >
              {t("subtext")}
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/#download" className="btn-primary">
                {t("primaryCta")}
                <ArrowRight size={16} weight="bold" aria-hidden />
              </Link>
              <Link href="/#how-it-works" className="btn-ghost">
                {t("secondaryCta")}
              </Link>
            </div>
          </Reveal>
        </div>

        {/* 右：手机框真实组件预览（非 div 假截图 - §4.8） */}
        <Reveal delay={0.2} className="hidden lg:flex justify-center">
          <PhoneFramePreview />
        </Reveal>
      </div>
    </section>
  );
}

/** 真渲染的迷你测量结果卡（不是 div 假截图） */
function PhoneFramePreview() {
  const t = useTranslations("products.craft.intro");
  return (
    <div
      className="relative"
      style={{ width: 320, height: 640 }}
      aria-label={t("previewLabel")}
    >
      {/* 手机外壳 */}
      <div
        className="absolute inset-0 rounded-[44px]"
        style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          boxShadow:
            "0 30px 80px -20px rgba(0,0,0,0.25), inset 0 0 0 6px var(--color-bg)",
        }}
      />
      {/* 顶部刘海占位 */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-b-2xl"
        style={{ top: 0, width: 120, height: 22, background: "var(--color-bg)" }}
      />
      {/* 屏幕内容 */}
      <div className="absolute inset-0 rounded-[40px] overflow-hidden pt-10 px-5">
        <PreviewScreen />
      </div>
    </div>
  );
}

function PreviewScreen() {
  const t = useTranslations("products.craft.intro");
  return (
    <div className="h-full flex flex-col">
      <div
        className="text-[12px] uppercase tracking-wider"
        style={{ color: "var(--color-fg-subtle)" }}
      >
        {t("previewResult")}
      </div>
      <div
        className="mt-3 card-elevated p-5"
        style={{ background: "var(--color-surface-tint)" }}
      >
        <div className="text-[13px]" style={{ color: "var(--color-fg-muted)" }}>
          {t("previewPalmLength")}
        </div>
        <div
          className="mt-1 text-[32px] font-semibold tracking-tight"
          style={{ color: "var(--color-fg)" }}
        >
          103.4{" "}
          <span className="text-[14px] font-normal" style={{ color: "var(--color-fg-muted)" }}>
            mm
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[12px]">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5"
            style={{
              background: "var(--color-accent-soft)",
              color: "var(--color-fg)",
            }}
          >
            {t("previewConfidence")}
          </span>
        </div>
      </div>
      <div
        className="mt-4 card-elevated p-5"
        style={{ background: "var(--color-accent)", color: "var(--color-accent-fg)" }}
      >
        <div className="text-[12px] opacity-70">{t("previewRecommended")}</div>
        <div className="mt-1 text-[24px] font-semibold tracking-tight">G3 · 4-3/8&quot;</div>
        <div className="mt-3 text-[12px] opacity-80 flex items-center justify-between">
          <span>{t("previewAdjacentSmaller")}</span>
          <span>{t("previewAdjacentLarger")}</span>
        </div>
      </div>
      <div
        className="mt-auto mb-6 mx-auto rounded-full p-3 inline-flex"
        style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
        }}
        aria-hidden
      >
        <Camera size={18} />
      </div>
    </div>
  );
}
