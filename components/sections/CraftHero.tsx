"use client";

import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
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
 * 用户 2026-09-11：右侧预览改用真实测量结果截图（来自 acecrush-craft/docs
 *   measurement_result.jpg），不再渲染 React-mock 卡片。沿用窄手机框 chrome
 *   让真实截图在桌面排版里仍是「手机外观」，与 hero 左侧文案对称。
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
      <div className="container-x grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] items-start gap-12 lg:gap-16">
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

        {/* 右：手机框真实测量结果截图（2026-09-11 切换至真实截图；移动端也要显示） */}
        <Reveal delay={0.2} className="flex justify-center mt-10 lg:mt-0">
          <PhoneFrameImage label={t("previewLabel")} />
        </Reveal>
      </div>
    </section>
  );
}

/**
 * 窄手机框 + 真实测量结果截图（measurement_result.jpg，1080×… portrait）。
 * 用户 2026-09-11：用户给的截图本身就是完整 Android 屏幕（已含状态栏 + 标题栏 + 内容），
 * 不再叠加 iOS 刘海占位；只保留外圈手机框 chrome，截图贴边铺满内屏。
 */
function PhoneFrameImage({ label }: { label: string }) {
  return (
    <div
      className="relative w-[260px] h-[520px] sm:w-[320px] sm:h-[640px]"
      role="img"
      aria-label={label}
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
      {/* 屏幕 = 真实测量结果截图（已经是完整屏幕，无需刘海） */}
      <img
        src="/img/craft/measurement_result.jpg"
        alt={label}
        width={1080}
        height={2400}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full rounded-[40px] object-cover"
      />
    </div>
  );
}
