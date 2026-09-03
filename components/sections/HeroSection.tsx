"use client";

import { ArrowRight, Camera } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";

/**
 * Hero - 非对称分屏（plan 004 v4 / skill §4.3 ANTI-CENTER BIAS, VARIANCE: 8）。
 * 左：eyebrow + headline + subtext + CTAs（≤ 4 文本元素，§4.7）。
 * 右：手机框真渲染迷你测量结果卡（§4.8 Hero needs a real visual）。
 *
 * accent 通过 CSS 变量（--color-accent / --color-accent-soft）随主题自动切换。
 *
 * v6n：grid 移入 container-x 内部，由 container-x 的 padding-inline 提供左右
 * 内边距；旧版 lg:px-0 覆盖让文案贴左（实际只离 main padding 24px），用户
 * 反馈「太靠左了」。现两侧至少 32px+ 安全留空，与下面 sections 对齐。
 */
export function HeroSection() {
  const t = useTranslations("hero");
  return (
    <section
      // v6g：min-h-[100dvh] 只在 lg+ 启用（双列布局 + 右侧手机预览都在的屏）；
      // 窄屏走自然流式高度，避免「文本短 + 100dvh 强制」导致底部大片空白。
      // v6n：去掉外层 grid，改在内部 container-x div 上 grid，承接 container-x 内边距。
      className="lg:min-h-[100dvh] pt-16 lg:pt-24 pb-16"
      aria-labelledby="hero-headline"
    >
      <div className="container-x grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] items-center gap-12 lg:gap-16">
        {/* 左：文案 */}
        <div>
          <Reveal>
            <p className="eyebrow">{t("eyebrow")}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1
              id="hero-headline"
              className="mt-5 text-[48px] md:text-[64px] lg:text-[80px] leading-[1.02] tracking-tighter font-extrabold"
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
              className="mt-6 max-w-[58ch] text-[16px] md:text-[17px] leading-relaxed"
              style={{ color: "var(--color-fg-muted)" }}
            >
              {t("subtext")}
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/#download" className="btn-primary">
                {t("primaryCta")}
                <ArrowRight size={16} weight="bold" />
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
  const t = useTranslations("hero");
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
  const t = useTranslations("hero");
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