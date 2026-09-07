"use client";

import { useTranslations } from "next-intl";
import { useLocaleStore, type Locale } from "@/lib/i18n/store";

/**
 * LocaleSwitcher - zh-CN / en 切换（v6 改 localStorage store，不再走 URL）。
 *
 * compact 模式（移动端）：原生 <select>，下拉形式，最省空间。
 * 默认模式（桌面端）：segmented buttons，与 plan 001 §4-15 的 btn + aria-pressed 风格保持一致。
 */
const OPTIONS: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "zh-CN", label: "中" },
];

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocaleStore();
  const t = useTranslations("nav");

  if (compact) {
    return (
      <select
        aria-label={t("localeLabel")}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="px-2 py-1.5 text-[12px] rounded-full"
        style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          color: "var(--color-fg)",
          minHeight: 36,
        }}
      >
        {OPTIONS.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="locale-seg" role="group" aria-label={t("localeLabel")}>
      {OPTIONS.map((o) => (
        <button
          key={o.code}
          type="button"
          aria-pressed={o.code === locale}
          onClick={() => {
            if (o.code !== locale) setLocale(o.code);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
