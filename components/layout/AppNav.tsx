"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight, List } from "@phosphor-icons/react/dist/ssr";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { BrandLogo } from "@/components/brand/BrandLogo";

/** 用户 2026-09-05：联系入口从 footer 搬到导航右上角，footer 整块移除。 */
const CONTACT_MAILTO = "mailto:acecrushdev@gmail.com";

/**
 * AppNav（plan 001 §4-13 + 用户 2026-09-07 调整）。
 *
 * 双产品改版：链接 Craft(#craft) / Swing Analysis(#swing) / Download / FAQ。
 *
 * 移动端布局（< lg）：
 *   - 左：brand + locale + theme 三个紧凑按钮（下拉 / 压缩式）
 *   - 右：汉堡菜单 summary（产品链接 + Contact）
 *
 * 桌面端布局（≥ lg）：
 *   - 左：brand
 *   - 中：产品链接 + FAQ
 *   - 右：contact mailto + LocaleSwitcher + ThemeSwitcher
 *
 * a11y 修复：
 *   - nav aria-label 原先错用 "Features"，改用 nav.navLabel
 *   - 移动端 <details> 菜单：summary 补 aria-expanded；点链接/Esc/外点关闭
 */
export function AppNav() {
  const t = useTranslations("nav");
  const tSite = useTranslations("site");
  const tFooter = useTranslations("footer");
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => {
    const el = detailsRef.current;
    if (el?.open) el.open = false;
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    function onPointerDown(e: PointerEvent) {
      const el = detailsRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) closeMenu();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen, closeMenu]);

  return (
    <nav
      className="select-none sticky top-0 z-40 backdrop-blur-md"
      style={{
        background: "color-mix(in oklab, var(--color-bg) 80%, transparent)",
        borderBottom: "1px solid var(--color-divider)",
      }}
      aria-label={t("navLabel")}
    >
      <div
        className="container-x flex items-center justify-between gap-2"
        style={{ height: 64 }}
      >
        {/* 左：品牌 */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[17px] font-bold"
            aria-label={tSite("brandName")}
          >
            <BrandLogo size={32} />
            {tSite("brandName")}
          </Link>
        </div>

        {/* 桌面端中央：产品链接 + FAQ（产品名写全，断点 lg 才能容下） */}
        <div className="hidden lg:flex items-center gap-6">
          <Link href="/#craft" className="text-[14px]" style={{ color: "var(--color-fg-muted)" }}>
            {t("productCraft")}
          </Link>
          <Link href="/#swing" className="text-[14px]" style={{ color: "var(--color-fg-muted)" }}>
            {t("productSwing")}
          </Link>
          <Link href="/#download" className="text-[14px]" style={{ color: "var(--color-fg-muted)" }}>
            {t("download")}
          </Link>
          <Link href="/#faq" className="text-[14px]" style={{ color: "var(--color-fg-muted)" }}>
            {t("faq")}
          </Link>
        </div>

        {/* 桌面右：contact + locale + theme */}
        <div className="hidden lg:flex items-center gap-2">
          <a
            href={CONTACT_MAILTO}
            className="btn-ghost text-[13px] py-2 px-4 gap-1.5"
          >
            {tFooter("contactLink")}
            <ArrowUpRight size={14} weight="bold" aria-hidden />
          </a>
          <LocaleSwitcher />
          <ThemeSwitcher />
        </div>

        {/* 移动端右：汉堡菜单（用户 2026-09-07 撤掉外置切换按钮）
            summary 用 List 图标，无文字。菜单内恢复 locale + theme 两个控件。 */}
        <details
          ref={detailsRef}
          className="lg:hidden relative"
          onToggle={(e) => setMenuOpen(e.currentTarget.open)}
        >
          <summary
            className="cursor-pointer list-none p-2 rounded-full inline-flex items-center justify-center"
            style={{
              border: "1px solid var(--color-border)",
              width: 40,
              height: 40,
            }}
            aria-expanded={menuOpen}
            aria-label={t("menuToggle")}
          >
            <List size={20} weight="bold" aria-hidden />
          </summary>
          <div
            className="absolute right-0 mt-2 w-64 p-3 space-y-2 rounded-2xl"
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
            }}
          >
            {/* 用户 2026-09-07：菜单内最上方放切换按钮（不再放菜单外） */}
            <div
              className="flex items-center justify-between gap-2 pb-2 mb-1"
              style={{ borderBottom: "1px solid var(--color-divider)" }}
            >
              <LocaleSwitcher />
              <ThemeSwitcher />
            </div>
            <Link href="/" className="block text-[14px] py-1" onClick={closeMenu}>
              {t("mobileHome")}
            </Link>
            <Link href="/#craft" className="block text-[14px] py-1" onClick={closeMenu}>
              {t("productCraft")}
            </Link>
            <Link href="/#swing" className="block text-[14px] py-1" onClick={closeMenu}>
              {t("productSwing")}
            </Link>
            <Link href="/#download" className="block text-[14px] py-1" onClick={closeMenu}>
              {t("download")}
            </Link>
            <Link href="/#faq" className="block text-[14px] py-1" onClick={closeMenu}>
              {t("faq")}
            </Link>
            <a
              href={CONTACT_MAILTO}
              className="block text-[14px] py-1"
              onClick={closeMenu}
            >
              {tFooter("contactLink")}
            </a>
          </div>
        </details>
      </div>
    </nav>
  );
}
