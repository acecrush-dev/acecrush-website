"use client";

import { useTranslations } from "next-intl";
import { AppNav } from "@/components/layout/AppNav";
import { AppFooter } from "@/components/layout/AppFooter";
import { BrandHero } from "@/components/sections/BrandHero";
import { LocaleLangSync } from "@/components/i18n/LocaleLangSync";

/**
 * HomeContent - 首页（2026-09-18 双产品拆路由后）。
 *
 * 首页只保留品牌级内容：
 *   AppNav → BrandHero（h1 + 3D 中心 + 两张产品卡，链接到 /craft/ 与 /swing-analysis/）→ AppFooter
 *
 * 产品详细介绍下移到 /craft/ 与 /swing-analysis/ 两个独立路由，
 * 由 CraftPageContent / SwingPageContent 提供；此前的 LandingContent（all-in-one
 * 单页锚点布局）已退役。
 *
 * A13：nav 之前插 skip link（sr-only-focusable，聚焦才可见），
 * 键盘用户可越过整条导航直达 <main id="main">。
 * 内嵌 LocaleLangSync：mount 后把 <html lang> 同步到当前 locale。
 */
export function HomeContent() {
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
      </main>
      <AppFooter />
    </>
  );
}
