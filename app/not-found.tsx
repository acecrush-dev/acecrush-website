"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Top-level 404（plan 001 §4-19 / 附录 A9）。
 *
 * output: 'export' 下生成 out/404.html 供静态托管直接 serve 不匹配路径。
 *
 * 旧版硬编码中英混排（「找不到这页。」+ 英文一句 + 「回到首页 / Home」按钮），
 * 完全绕开 i18n。改为 useTranslations("notFound")（key 早已存在于两份 messages）。
 * 已知取舍：404.html 的文案依赖 hydration，无 JS 时显示 en 默认，可接受。
 */
export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 32,
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "ui-monospace, monospace",
          color: "var(--color-fg-subtle)",
        }}
      >
        {t("code")}
      </p>
      <h1
        style={{
          fontSize: 36,
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        {t("title")}
      </h1>
      <p style={{ color: "var(--color-fg-muted)", fontSize: 15 }}>{t("body")}</p>
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "14px 24px",
          borderRadius: 999,
          background: "var(--color-accent)",
          color: "var(--color-accent-fg)",
          fontWeight: 600,
          textDecoration: "none",
          marginTop: 8,
        }}
      >
        {t("cta")}
      </Link>
    </main>
  );
}
