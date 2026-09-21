"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { AppNav } from "@/components/layout/AppNav";
import { AppFooter } from "@/components/layout/AppFooter";
import { CraftHero } from "@/components/sections/CraftHero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { FeaturesBento } from "@/components/sections/FeaturesBento";
import { PrivacyStrip } from "@/components/sections/PrivacyStrip";
import { CraftDownloadBlock } from "@/components/sections/DownloadSection";
import { FaqList } from "@/components/sections/FaqSection";
import { LocaleLangSync } from "@/components/i18n/LocaleLangSync";
import { Reveal } from "@/components/motion/reveal";

/**
 * CraftPageContent - /craft/ 独立路由内容（2026-09-18 双产品拆路由后）。
 *
 * AppNav → CraftHero → HowItWorks → FeaturesBento → PrivacyStrip →
 *   CraftDownloadBlock（Android APK + iOS TestFlight）→ FaqList（仅 Craft） → AppFooter
 *
 * 与原单页版本相比：去掉 SwingSection / SwingDownloadBlock / Swing FAQ，
 *  只保留 Craft 相关 sections；URL 锚点不再被依赖，每个 section 不再带 id 锚。
 *
 * A13：skip link + LocaleLangSync 与其他页面一致。
 *
 * 2026-09-21：FAQ a4 答案末尾的"云同步指南"必须渲染成可点击链接
 *   （target=_blank，外部子站）。FaqList 接受 answerNodes prop，
 *   此处塞入 a4 的 JSX，用 useTranslations 读 a4LinkLabel 作为锚文字
 *   （locale 感知），拼接 <a target=_blank>。
 *   不用 t.rich + {link} 占位符（next-intl 4.x 在静态导出 SSR 下行为异常）。
 */
const CLOUD_SYNC_HREF =
  "https://craft-docs.acecrush.dev/zh/guide/06-cloud-sync.html";

export function CraftPageContent() {
  const t = useTranslations("nav");
  const tFaq = useTranslations("products.craft.faq");
  return (
    <>
      <LocaleLangSync />
      <a href="#main" className="skip-link">
        {t("skipToContent")}
      </a>
      <AppNav />
      <main id="main">
        <CraftHero />
        <HowItWorks />
        <FeaturesBento />
        <PrivacyStrip />
        <section
          id="download"
          className="container-x py-28 lg:py-44"
          aria-labelledby="dl-craft-heading"
        >
          <Reveal>
            <h2
              id="dl-craft-heading"
              className="text-[32px] md:text-[44px] leading-[1.1] tracking-tight font-semibold"
            >
              {t("download")}
            </h2>
          </Reveal>
          <CraftDownloadBlock />
        </section>
        <section
          id="faq"
          className="container-x py-28 lg:py-44"
          aria-labelledby="faq-craft-heading"
        >
          <Reveal>
            <h2
              id="faq-craft-heading"
              className="text-[32px] md:text-[40px] leading-[1.1] tracking-tight font-semibold"
            >
              {t("faq")}
            </h2>
          </Reveal>
          <FaqList
            namespace="products.craft.faq"
            headingId="faq-craft-list-heading"
            className="mt-12"
            answerNodes={{
              a4: (
                <>
                  {tFaq("a4")}{" "}
                  <a
                    href={CLOUD_SYNC_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline inline-flex items-baseline gap-0.5"
                    style={{ color: "var(--color-fg)" }}
                  >
                    <span>{tFaq("a4LinkLabel")}</span>
                    <ArrowUpRight
                      size={13}
                      weight="bold"
                      aria-hidden
                      className="inline-block"
                    />
                  </a>
                  {"。"}
                </>
              ),
            }}
          />
        </section>
      </main>
      <AppFooter />
    </>
  );
}
