"use client";

import { useTranslations } from "next-intl";
import { useLocaleStore, type Locale } from "@/lib/i18n/store";

/**
 * LocaleSwitcher - zh-CN / en 切换（v6 改 localStorage store，不再走 URL）。
 * 直接调 setLocale：store 写 localStorage + setState，触发 I18nProvider 重渲染 messages，
 * 所有 useTranslations 消费者自动 rerender。
 *
 * plan 001 §4-15（附录 A5）：原实现用 `<a href="#">` + preventDefault 做假链接，
 * 语义错误（不是导航）、中键/右键「在新标签打开」会跳到 `#`、屏幕阅读器读成链接。
 * 改为 `<button type="button">` + `aria-pressed` 标记激活项；
 * globals.css 的 `.locale-seg a` 选择器同步改为 `.locale-seg button`。
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
