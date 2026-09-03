"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useLocaleStore } from "@/lib/i18n/store";
import { BrandLogo } from "@/components/brand/BrandLogo";

/**
 * AppNav（plan 004 v6k / plan 006 v0）。
 *
 * v6k：改为 'use client' + useTranslations。
 *   原版用 server `getTranslations({ locale: 'en' })`，server 永远渲染英文，
 *   用户切到 zh-CN 后整树不重渲染 → 「中文不显示」反馈。
 *   改 client 后 useTranslations 读 NextIntlClientProvider context，locale
 *   切换立即生效。
 * v6k：移除 /privacy 链接（全站 SPA，去掉独立隐私页）。
 * v006：圆形 brand mark 从 <TennisBall> Phosphor 图标改为 <BrandLogo size=28>，
 *   color 显式传 var(--color-accent-fg) 让 SVG ball 在 accent 圆块上呈深色，
 *   文字/S 曲线借 mix-blend-mode: difference 自动反色。
 */
export function AppNav() {
  const t = useTranslations("nav");
  const tSite = useTranslations("site");
  const { locale } = useLocaleStore();
  // 让 SSR 与 client 首帧 lang 属性对齐，hydration 时 suppressHydrationWarning
  // 已包在 <html> 上所以不会 warn。
  void locale;

  return (
    <nav
      className="select-none sticky top-0 z-40 backdrop-blur-md"
      style={{
        background: "color-mix(in oklab, var(--color-bg) 80%, transparent)",
        borderBottom: "1px solid var(--color-divider)",
      }}
      aria-label={t("primaryFeatures")}
    >
      <div className="container-x flex items-center justify-between gap-4" style={{ height: 64 }}>
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[17px] font-bold"
          aria-label={tSite("appName")}
        >
          {/* 006 v4：去掉原 green accent 圆块，BrandLogo 自身在 dark theme 下
              用 CSS .brand-logo-wrapper 加白底容器，与 App AppBar 视觉对齐 */}
          <BrandLogo size={32} />
          {tSite("appName")}
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-7">
          <Link href="/#features" className="text-[14px]" style={{ color: "var(--color-fg-muted)" }}>
            {t("primaryFeatures")}
          </Link>
          <Link href="/#how-it-works" className="text-[14px]" style={{ color: "var(--color-fg-muted)" }}>
            {t("primaryHow")}
          </Link>
          <Link href="/#download" className="text-[14px]" style={{ color: "var(--color-fg-muted)" }}>
            {t("primaryDownload")}
          </Link>
          <Link href="/#faq" className="text-[14px]" style={{ color: "var(--color-fg-muted)" }}>
            {t("primaryFaq")}
          </Link>
        </div>

        {/* Right: locale + theme + mobile menu */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeSwitcher />
          </div>

          {/* Mobile details/summary (no JS still works) */}
          <details className="md:hidden relative">
            <summary
              className="cursor-pointer list-none px-3 py-2 text-[14px] rounded-full"
              style={{ border: "1px solid var(--color-border)" }}
            >
              {t("menuToggle")}
            </summary>
            <div
              className="absolute right-0 mt-2 w-56 p-3 space-y-2 rounded-2xl"
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
              }}
            >
              <Link href="/" className="block text-[14px] py-1">{t("mobileHome")}</Link>
              <Link href="/#features" className="block text-[14px] py-1">{t("primaryFeatures")}</Link>
              <Link href="/#how-it-works" className="block text-[14px] py-1">{t("primaryHow")}</Link>
              <Link href="/#download" className="block text-[14px] py-1">{t("primaryDownload")}</Link>
              <Link href="/#faq" className="block text-[14px] py-1">{t("primaryFaq")}</Link>
              <div className="pt-2 mt-2" style={{ borderTop: "1px solid var(--color-divider)" }}>
                <div className="flex items-center gap-2">
                  <LocaleSwitcher />
                  <ThemeSwitcher />
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </nav>
  );
}