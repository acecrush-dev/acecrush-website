"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { BrandLogo } from "@/components/brand/BrandLogo";

/**
 * AppFooter - 全站页脚（用户 2026-09-16 恢复 + 同日多次微调 + 2026-09-16 第三次改版）。
 *
 * 历史：
 *   plan 001 §4-13 原本有 footer；2026-09-05 用户撤掉整块 footer。
 *   2026-09-16 恢复 footer，Contact 下放改名 Support，加 Privacy / Terms / 版权。
 *   同日反馈「footer 要居中一些 + 加 logo」→ 三段单列居中堆叠。
 *   同日反馈「logo+AceCrush 与链接并排」→ 第一行 [logo+brand 左 | 链接 右] + 版权居中第二行。
 *   同日参考 latuvo.com 布局：footer 改成单行 flex bar（space-between + flex-wrap）：
 *     左侧 [ BrandLogo + AceCrush ] · 中部 [ Support · Privacy · Terms ] · 右侧版权行。
 *     窄屏 wrap 后各组自然换行居中。
 *
 * 参考 latuvo 间距：bar 上下 padding `36px 0 48px`、横向 gap `20px`、链接间距 `24px`。
 *
 * locale 切换仍由客户端 store 控制，链接不带 locale 前缀；
 * 版权年份取客户端当前年（整段标 client 避免 SSR/CSR 不一致）。
 */

const SUPPORT_MAILTO = "mailto:acecrushdev@gmail.com";

export function AppFooter() {
  const t = useTranslations("footer");
  const tSite = useTranslations("site");
  const year = new Date().getFullYear();

  return (
    <footer
      aria-label="Site footer"
      className="mt-16 md:mt-24"
      style={{
        borderTop: "1px solid var(--color-divider)",
        background: "var(--color-surface)",
      }}
    >
      <div
        className="container-x flex flex-wrap items-center justify-between gap-x-8 gap-y-5"
        style={{ paddingTop: 28, paddingBottom: 40 }}
      >
        <Link
          href="/"
          aria-label={tSite("brandName")}
          className="inline-flex items-center gap-2.5 text-[17px] font-bold"
          style={{ color: "var(--color-fg)" }}
        >
          <BrandLogo size={32} alt={tSite("brandName")} />
          {tSite("brandName")}
        </Link>

        <nav
          aria-label={t("supportLink")}
          className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] order-3 md:order-2 w-full md:w-auto justify-center md:justify-start"
        >
          <a
            href={SUPPORT_MAILTO}
            className="inline-flex items-center gap-1"
            style={{ color: "var(--color-fg-muted)" }}
          >
            {t("supportLink")}
            <ArrowUpRight size={13} weight="bold" aria-hidden />
          </a>
          <Link
            href="/privacy/"
            className="inline-flex items-center"
            style={{ color: "var(--color-fg-muted)" }}
          >
            {t("privacyLink")}
          </Link>
          <Link
            href="/terms/"
            className="inline-flex items-center"
            style={{ color: "var(--color-fg-muted)" }}
          >
            {t("termsLink")}
          </Link>
        </nav>

        <p
          className="text-[12px] order-2 md:order-3"
          style={{ color: "var(--color-fg-subtle)" }}
        >
          {t("copyright", { year })}
        </p>
      </div>
    </footer>
  );
}
