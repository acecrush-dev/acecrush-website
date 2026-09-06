"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { BrandLogo } from "@/components/brand/BrandLogo";

/** 用户 2026-09-05：联系入口从 footer 搬到导航右上角，footer 整块移除。 */
const CONTACT_MAILTO = "mailto:lunatic0072006@hotmail.com";

/**
 * AppNav（plan 001 §4-13）。
 *
 * 双产品改版：链接从「功能 / 原理 / 下载 / FAQ」改为
 *   Craft(#craft) / Swing Analysis(#swing) / Download(#download) / FAQ(#faq) / Contact(#contact)。
 * 品牌文字改 `site.brandName`（"AceCrush"，不再是单产品名）。
 *
 * a11y 修复（附录 A4 / A10）：
 *   - nav aria-label 原先错用 t("primaryFeatures") = "Features"，改用 nav.navLabel
 *   - 移动端 <details> 菜单：summary 补 aria-expanded（onToggle 同步 state）；
 *     点菜单内任一链接自动关闭；Esc 关闭；点击菜单外部关闭。
 *     全部监听在 open 时才挂、cleanup 时摘掉，关闭态零监听开销。
 *   - 删除 B4 死代码 `void locale;`（locale 变化由 NextIntlClientProvider
 *     驱动 useTranslations 重渲染，本组件无需订阅 store）
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

  // Esc 关闭 + 点击菜单外部关闭（仅在展开时挂监听）
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
      <div className="container-x flex items-center justify-between gap-4" style={{ height: 64 }}>
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[17px] font-bold"
          aria-label={tSite("brandName")}
        >
          <BrandLogo size={32} />
          {tSite("brandName")}
        </Link>

        {/* Desktop nav links。
            用户要求产品名一律写全（"AceCrush Craft" / "AceCrush 挥拍分析"），
            这一行比原来宽了约 200px，在 md(768px) 会挤爆，故断点整体
            md → lg：768~1024 之间走移动端汉堡菜单。 */}
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

        {/* Right: contact + locale + theme + mobile menu */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2">
            {/* 用户 2026-09-05：联系入口从 footer 提到导航右上角，
                位置在语言切换器左边；footer 整块已移除。 */}
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

          {/* Mobile details/summary（无 JS 时仍可展开） */}
          <details
            ref={detailsRef}
            className="lg:hidden relative"
            onToggle={(e) => setMenuOpen(e.currentTarget.open)}
          >
            <summary
              className="cursor-pointer list-none px-3 py-2 text-[14px] rounded-full"
              style={{ border: "1px solid var(--color-border)" }}
              aria-expanded={menuOpen}
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
