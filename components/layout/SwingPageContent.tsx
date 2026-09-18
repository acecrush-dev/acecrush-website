"use client";

import { useTranslations } from "next-intl";
import { AppNav } from "@/components/layout/AppNav";
import { AppFooter } from "@/components/layout/AppFooter";
import { SwingSection } from "@/components/sections/SwingSection";
import { SwingDownloadBlock } from "@/components/sections/DownloadSection";
import { FaqList } from "@/components/sections/FaqSection";
import { LocaleLangSync } from "@/components/i18n/LocaleLangSync";
import { Reveal } from "@/components/motion/reveal";

/**
 * SwingPageContent - /swing-analysis/ 独立路由内容（2026-09-18 双产品拆路由后）。
 *
 * AppNav → SwingSection → SwingDownloadBlock（仅桌面端）→ FaqList（仅 Swing） → AppFooter
 *
 * 与原单页版本相比：去掉 CraftHero / HowItWorks / FeaturesBento / PrivacyStrip /
 *   CraftDownloadBlock / Craft FAQ，只保留 Swing 相关 sections；URL 锚点不再被依赖。
 *
 * A13：skip link + LocaleLangSync 与其他页面一致。
 */
export function SwingPageContent() {
  const t = useTranslations("nav");
  return (
    <>
      <LocaleLangSync />
      <a href="#main" className="skip-link">
        {t("skipToContent")}
      </a>
      <AppNav />
      <main id="main">
        <SwingSection />
        <section
          id="download"
          className="container-x py-28 lg:py-44"
          aria-labelledby="dl-swing-heading"
        >
          <Reveal>
            <h2
              id="dl-swing-heading"
              className="text-[32px] md:text-[44px] leading-[1.1] tracking-tight font-semibold"
            >
              {t("download")}
            </h2>
          </Reveal>
          <SwingDownloadBlock />
        </section>
        <section
          id="faq"
          className="container-x py-28 lg:py-44"
          aria-labelledby="faq-swing-heading"
        >
          <Reveal>
            <h2
              id="faq-swing-heading"
              className="text-[32px] md:text-[40px] leading-[1.1] tracking-tight font-semibold"
            >
              {t("faq")}
            </h2>
          </Reveal>
          <FaqList
            namespace="products.swing.faq"
            headingId="faq-swing-list-heading"
            className="mt-12"
          />
        </section>
      </main>
      <AppFooter />
    </>
  );
}
