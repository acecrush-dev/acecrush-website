"use client";

import { useEffect } from "react";
import { useLocaleStore } from "@/lib/i18n/store";

/**
 * LocaleLangSync - 在 mount 与 locale 变化时把 <html lang> 同步到当前 locale（v6）。
 * 替换 v4 旧版用 next-intl useLocale 的实现，现在直接从 i18n store 读。
 */
export function LocaleLangSync() {
  const { locale } = useLocaleStore();
  useEffect(() => {
    const next = locale === "zh-CN" ? "zh-CN" : "en";
    if (document.documentElement.lang !== next) {
      document.documentElement.lang = next;
    }
  }, [locale]);
  return null;
}