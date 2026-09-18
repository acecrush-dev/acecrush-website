"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { List } from "@phosphor-icons/react/dist/ssr";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { GithubMark } from "@/components/brand/GithubMark";

// 用户 2026-09-16：nav 加本站 GitHub repo 入口。
const GITHUB_URL = "https://github.com/acecrush-dev/acecrush-website";

// 产品路由前缀（用于 active 高亮判定）。
// usePathname 返回带 trailingSlash 的路径（/craft/、/swing-analysis/），
// 直接 startsWith 比较即可。
const PRODUCT_ROUTES = ["/craft/", "/swing-analysis/"] as const;

/**
 * AppNav（plan 001 §4-13 + 用户 2026-09-07 / 2026-09-16 / 2026-09-18 调整）。
 *
 * 历史：
 *   2026-09-05：联系入口从 footer 搬到导航右上角，footer 整块移除。
 *   2026-09-16：恢复 footer，并把 Contact 下放 footer 改名为 Support；
 *              桌面右栏与移动菜单的 contact mailto 一并删除。
 *   2026-09-18：双产品拆为独立路由（/craft/、/swing-analysis/），
 *              删除桌面与移动菜单的 #craft / #swing / #download / #faq 锚点链接。
 *              用户后续追加："上方 nav 只需要 2 个路由 2 个产品的名字" +
 *              "nav 不要如此居中 往右靠 和 github btn 有点 margin" +
 *              "nav 到了对应路由 要高亮" +
 *              "移动版的 dark light lan 切换放到菜单外面 菜单需要右对齐"。
 *              nav 只保留两个产品路由（Craft / Swing Analysis）作为主要跳转，
 *              桌面布局从「左 brand / 中产品 / 右 GitHub+locale+theme」改为
 *              「左 brand / 右 产品组+GitHub+locale+theme（产品组跟 GitHub 之间
 *              有 pr-4 margin，与右栏控件组保持视觉分隔）」。
 *              当前路由对应的产品链接 active 高亮（fg 而非 fg-muted，加粗），靠
 *              usePathname 判定；移动菜单同步高亮。
 *              移动端（< lg）把 LocaleSwitcher / ThemeSwitcher 移出汉堡菜单，
 *              与汉堡按钮一起右对齐；菜单本身只保留 Home + 2 产品 + GitHub，
 *              面板右对齐（`right-0`，相对 <details> 右缘）。
 *
 * 移动端布局（< lg）：
 *   - 左：brand
 *   - 右：LocaleSwitcher + ThemeSwitcher + 汉堡菜单 summary（菜单里只有
 *          Home + 2 个产品链接 + GitHub，面板 right-0 右对齐）
 *
 * 桌面端布局（≥ lg）：
 *   - 左：brand
 *   - 右：产品链接 + GitHub + LocaleSwitcher + ThemeSwitcher（产品往右靠）
 *
 * a11y 修复：
 *   - nav aria-label 原先错用 "Features"，改用 nav.navLabel
 *   - 移动端 <details> 菜单：summary 补 aria-expanded；点链接/Esc/外点关闭
 */
export function AppNav() {
  const t = useTranslations("nav");
  const tSite = useTranslations("site");
  const pathname = usePathname() ?? "/";
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // 哪个产品路由当前激活。两者互斥：首页时两个都 false，都用 muted 灰。
  const activeProduct = useMemo(() => {
    if (PRODUCT_ROUTES.some((r) => pathname === r || pathname.startsWith(r)))
      return pathname.startsWith("/craft/") ? "/craft/" : "/swing-analysis/";
    return null;
  }, [pathname]);

  // active 链接 = fg + font-semibold；非 active = fg-muted。
  const linkStyle = (href: string): React.CSSProperties => ({
    color:
      href === activeProduct ? "var(--color-fg)" : "var(--color-fg-muted)",
    fontWeight: href === activeProduct ? 600 : 400,
  });

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

  // 路由变化时滚到顶（用户 2026-09-18 反馈：点 nav 后页面跳到底部）。
  // 根因：next.config.mjs `output:'export' + trailingSlash:true` 走 full page
  // nav，Next.js 的 client-side scroll restoration 不触发，浏览器保留上一页
  // scrollY；新页面若比上一页短，视觉上就落在底部。usePathname 在 mount 与
  // 每次客户端路由变化时都会更新，所以这里挂一个 effect 即可覆盖 SPA 内
  // 软跳转（首屏直出时 effect 也会跑一次，无副作用）。hash-only 变化不滚。
  useEffect(() => {
    if (typeof window === "undefined") return;
    const { pathname: p, hash } = window.location;
    if (p === pathname && hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <nav
      className="select-none sticky top-0 z-40 backdrop-blur-md"
      style={{
        background: "color-mix(in oklab, var(--color-bg) 80%, transparent)",
        borderBottom: "1px solid var(--color-divider)",
      }}
      aria-label={t("navLabel")}
    >
      {/* 用户 2026-09-18：移动版 logo 看着不左对齐，`.container-x` 全站
          padding-inline 是 clamp(4rem,10vw,9rem)，移动端约 64px，对 nav
          这种贴边控件组太宽，logo 文字被推到右侧，视觉上"过于居中"。
          这里用自定义 padding 覆盖：移动 1rem（16px），sm 1.5rem，
          md 起与 container-x 持平（lg 用 container-x 的 4rem~9rem）。
          不改 globals.css，避免影响正文段落/卡片等其他用 container-x 的地方。 */}
      <div
        className="flex items-center gap-2 lg:container-x"
        style={{
          height: 80,
          paddingInline: "clamp(1rem, 4vw, 1.5rem)",
        }}
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

        {/* 桌面右：2 个产品路由（往右靠） + GitHub（带 pl-4 margin 与产品分隔）
            + locale + theme。整组用 ml-auto 推到最右。 */}
        <div className="ml-auto hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-6 pr-4">
            <Link
              href="/craft/"
              className="text-[14px] transition-colors"
              style={linkStyle("/craft/")}
              aria-current={activeProduct === "/craft/" ? "page" : undefined}
            >
              {t("productCraft")}
            </Link>
            <Link
              href="/swing-analysis/"
              className="text-[14px] transition-colors"
              style={linkStyle("/swing-analysis/")}
              aria-current={
                activeProduct === "/swing-analysis/" ? "page" : undefined
              }
            >
              {t("productSwing")}
            </Link>
          </div>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("githubLink")}
            title={t("githubLink")}
            className="inline-flex items-center justify-center rounded-full transition-colors"
            style={{
              width: 32,
              height: 32,
              border: "1px solid var(--color-border)",
              color: "var(--color-fg-muted)",
            }}
          >
            <GithubMark size={16} />
          </a>
          <LocaleSwitcher />
          <ThemeSwitcher />
        </div>

        {/* 移动端右：汉堡菜单（用户 2026-09-18 把 locale/theme 又搬回菜单内），
            面板 right-0 相对 <details> 右缘，菜单右对齐。
            菜单里第一行放 LocaleSwitcher + ThemeSwitcher（用 divider 与下方
            链接分隔），下方依次为 Home + 2 个产品链接 + GitHub。 */}
        <details
          ref={detailsRef}
          className="ml-auto relative lg:hidden"
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
            <Link
              href="/craft/"
              className="block text-[14px] py-1 transition-colors"
              style={linkStyle("/craft/")}
              aria-current={activeProduct === "/craft/" ? "page" : undefined}
              onClick={closeMenu}
            >
              {t("productCraft")}
            </Link>
            <Link
              href="/swing-analysis/"
              className="block text-[14px] py-1 transition-colors"
              style={linkStyle("/swing-analysis/")}
              aria-current={
                activeProduct === "/swing-analysis/" ? "page" : undefined
              }
              onClick={closeMenu}
            >
              {t("productSwing")}
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 pt-2 mt-1 text-[14px]"
              style={{ borderTop: "1px solid var(--color-divider)" }}
              onClick={closeMenu}
            >
              <span>{t("githubLink")}</span>
              <GithubMark size={14} />
            </a>
          </div>
        </details>
      </div>
    </nav>
  );
}
