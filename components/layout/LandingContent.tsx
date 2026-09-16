"use client";

import { useTranslations } from "next-intl";
import { AppNav } from "@/components/layout/AppNav";
import { AppFooter } from "@/components/layout/AppFooter";
import { BrandHero } from "@/components/sections/BrandHero";
import { CraftHero } from "@/components/sections/CraftHero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { FeaturesBento } from "@/components/sections/FeaturesBento";
import { PrivacyStrip } from "@/components/sections/PrivacyStrip";
import { SwingSection } from "@/components/sections/SwingSection";
import { DownloadSection } from "@/components/sections/DownloadSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { LocaleLangSync } from "@/components/i18n/LocaleLangSync";

/**
 * LandingContent（plan 001 §4-12）。
 *
 * 双产品单页 SPA 分区顺序：
 *   AppNav
 *   → BrandHero（品牌 h1 + 两张产品简介卡）
 *   → CraftHero (#craft) → HowItWorks → FeaturesBento → PrivacyStrip
 *   → SwingSection (#swing)
 *   → DownloadSection (#download，双产品分组)
 *   → FaqSection (#faq，双产品分组)
 *   → AppFooter（2026-09-16 恢复，含 Support / Privacy / Terms / 版权）
 *
 * 历史：
 *   2026-09-05：footer 整块移除；联系入口改为 AppNav 右上角的 mailto 按钮。
 *   2026-09-16：恢复 footer，Contact 下放 footer 并改名 Support；
 *              AppNav 的 contact 按钮 / 移动菜单里的 mailto 一并删除。
 *
 * A13：nav 之前插 skip link（sr-only-focusable，聚焦才可见），
 * 键盘用户可越过整条导航直达 <main id="main">。
 * 内嵌 LocaleLangSync：mount 后把 <html lang> 同步到当前 locale。
 */
export function LandingContent() {
  const t = useTranslations("nav");
  return (
    <>
      <LocaleLangSync />
      <a href="#main" className="skip-link">
        {t("skipToContent")}
      </a>
      <AppNav />
      <main id="main">
        <BrandHero />
        <CraftHero />
        <HowItWorks />
        <FeaturesBento />
        <PrivacyStrip />
        <SwingSection />
        <DownloadSection />
        <FaqSection />
      </main>
      <AppFooter />
    </>
  );
}
