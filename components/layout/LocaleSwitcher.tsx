"use client";

import { useTranslations } from "next-intl";
import { useLocaleStore, type Locale } from "@/lib/i18n/store";

/**
 * LocaleSwitcher - zh-CN / en 切换（v6 改 localStorage store，不再走 URL）。
 * 直接调 setLocale：store 写 localStorage + setState，触发 I18nProvider 重渲染 messages，
 * 所有 useTranslations 消费者自动 rerender。
 */
const OPTIONS: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "zh-CN", label: "中" },
];

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocaleStore();
  const t = useTranslations("nav");

  return (
    <div className="locale-seg" role="group" aria-label={t("localeLabel")}>
      {OPTIONS.map((o) => (
        <a
          key={o.code}
          href="#"
          aria-current={o.code === locale ? "true" : undefined}
          onClick={(e) => {
            e.preventDefault();
            if (o.code !== locale) setLocale(o.code);
          }}
        >
          {o.label}
        </a>
      ))}
    </div>
  );
}