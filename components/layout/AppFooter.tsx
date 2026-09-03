"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { BrandLogo } from "@/components/brand/BrandLogo";

/**
 * AppFooter（plan 004 v6m / plan 006 v0）。
 *
 * v6m 重排：
 *   - 去掉横向 quick nav（用户反馈 footer 不需要菜单）
 *   - 去掉 ICP placeholder（备案下来前不再占位 UI）
 *   - copyright 居中放在 footer 顶/底分隔条上方
 *   - 顶部一行：brand 左，contact us CTA 右（保留作为唯一 action）
 *   - 整块加 select-none（v6m），footer 文案不让复制/粘贴
 *   - BG 用 --color-surface，v6m 已调成中性科技色（#FFFFFF light / #14141A dark）
 * v006：brand 块顶部加 <BrandLogo size=24>，文字 appName 紧随其后；
 *   logo 走父级 currentColor（var(--color-fg)），主题感知。
 */
export function AppFooter() {
  const t = useTranslations("footer");
  const tSite = useTranslations("site");
  return (
    <footer
      className="select-none mt-24"
      style={{
        borderTop: "1px solid var(--color-divider)",
        background: "var(--color-surface)",
      }}
    >
      <div className="container-x py-12">
        {/* Top row: brand | contact CTA */}
        <div className="flex flex-col gap-8 md:flex-row md:justify-between md:items-start">
          <div className="max-w-[28ch]">
            <div className="flex items-center gap-2">
              <BrandLogo size={24} />
              <span className="text-[15px] font-semibold">{tSite("appName")}</span>
            </div>
          </div>

          <a
            href="mailto:hi@acecrush.dev"
            className="btn-ghost text-[13px] py-2 px-4 inline-flex items-center gap-1.5 md:self-start"
          >
            {t("contactLink")}
            <ArrowUpRight size={14} weight="bold" aria-hidden />
          </a>
        </div>

        {/* Bottom: centered copyright */}
        <div
          className="mt-10 pt-6 text-center text-[12px]"
          style={{
            color: "var(--color-fg-subtle)",
            borderTop: "1px solid var(--color-divider)",
          }}
        >
          {t("copyright")}
        </div>
      </div>
    </footer>
  );
}