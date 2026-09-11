"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight, List } from "@phosphor-icons/react/dist/ssr";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { requestEnter, requestExit } from "@/lib/three/viewStore";

/** 用户 2026-09-05：联系入口从 footer 搬到导航右上角，footer 整块移除。 */
const CONTACT_MAILTO = "mailto:acecrushdev@gmail.com";

/**
 * AppNav（plan 001 §4-13 + 用户 2026-09-11 多次转向）。
 *
 * 用户 2026-09-11 v4 转向：
 *   - 去掉 header 区域背景 / border / backdrop-blur：nav 透明，融入 3D 场景
 *   - logo 不要 3D btn 背景：纯文本/图标，无 box
 *   - 产品 btn 保留 3D btn 效果（hover/active），但去 box 的视觉强度
 *   - locale/theme 紧凑放在一起（gap-0.5 = 2px）
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

  // 用户 2026-09-11 v9：上方 nav 必须起作用，和球上 tooltip 同一模块点击效果相同
  // → 进入对应产品的 3D 房间（独立 3D 空间）。
  // 之前只 replaceState hash 无效（3D 模式下 #craft / #swing 元素不存在）。
  const handleProductClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, room: "craft" | "swing") => {
      if (typeof window === "undefined") return;
      e.preventDefault();
      // 关闭汉堡菜单（如果是移动端点进来）
      closeMenu();
      // 触发房间进入（与球上 tooltip 点击走同一动作）
      requestEnter(room);
    },
    [closeMenu]
  );

  return (
    <nav
      className="select-none sticky top-0 z-40 app-nav-flat"
      aria-label={t("navLabel")}
    >
      <div
        className="container-x flex items-center justify-between gap-2"
        style={{ height: 64 }}
      >
        {/* 左：用户 2026-09-11 v8：brand 回到 nav 左上角，静态 HTML logo
            - 与球体部分完全分隔开（不被 3D 场景动画影响）
            - logo 不能动（不旋转 / 不浮起），纯静态
            - 无 3D btn 背景 / box（v4 转向）
            - 用户 v16：点击 brand 回首页（hub / 球体页面） */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="app-brand-static"
            aria-label={tSite("brandName")}
            onClick={(e) => {
              // 3D 模式下：阻止默认行为，直接 requestExit 回 hub（球体页面）
              e.preventDefault();
              requestExit();
            }}
          >
            <BrandLogo size={28} />
            <span>{tSite("brandName")}</span>
          </Link>
        </div>

        {/* 桌面端中央：Craft / Swing 3D btn 链接 */}
        <div className="hidden lg:flex items-center gap-2">
          <a
            href="/#craft"
            className="nav-btn-3d nav-btn-product"
            style={{ "--btn-accent": "#2563EB" } as React.CSSProperties}
            onClick={(e) => handleProductClick(e, "craft")}
          >
            {t("productCraft")}
          </a>
          <a
            href="/#swing"
            className="nav-btn-3d nav-btn-product"
            style={{ "--btn-accent": "#DC2626" } as React.CSSProperties}
            onClick={(e) => handleProductClick(e, "swing")}
          >
            {t("productSwing")}
          </a>
        </div>

        {/* 桌面右：contact + locale + theme (locale + theme 紧贴，gap-0.5) */}
        <div className="hidden lg:flex items-center gap-2">
          <a
            href={CONTACT_MAILTO}
            className="nav-btn-3d nav-btn-contact"
            aria-label={tFooter("contactLink")}
          >
            {tFooter("contactLink")}
            <ArrowUpRight size={14} weight="bold" aria-hidden />
          </a>
          <div className="flex items-center gap-0.5 switcher-group">
            <LocaleSwitcher />
            <ThemeSwitcher />
          </div>
        </div>

        {/* 移动端右：汉堡菜单 */}
        <details
          ref={detailsRef}
          className="lg:hidden relative"
          onToggle={(e) => setMenuOpen(e.currentTarget.open)}
        >
          <summary
            className="cursor-pointer list-none p-2 rounded-full inline-flex items-center justify-center app-btn-flat"
            aria-expanded={menuOpen}
            aria-label={t("menuToggle")}
          >
            <List size={20} weight="bold" aria-hidden />
          </summary>
          <div className="absolute right-0 mt-2 w-64 p-3 space-y-2 rounded-2xl app-menu-popup">
            <div
              className="flex items-center justify-between gap-2 pb-2 mb-1"
              style={{ borderBottom: "1px solid var(--color-divider)" }}
            >
              <LocaleSwitcher />
              <ThemeSwitcher />
            </div>
            <Link href="/" className="nav-menu-link" onClick={closeMenu}>
              {t("mobileHome")}
            </Link>
            <a
              href="/#craft"
              className="nav-menu-link"
              onClick={(e) => handleProductClick(e, "craft")}
            >
              {t("productCraft")}
            </a>
            <a
              href="/#swing"
              className="nav-menu-link"
              onClick={(e) => handleProductClick(e, "swing")}
            >
              {t("productSwing")}
            </a>
            <a
              href={CONTACT_MAILTO}
              className="nav-menu-link"
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