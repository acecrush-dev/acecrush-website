"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect, useState } from "react";
import enMessages from "@/messages/en.json";
import zhMessages from "@/messages/zh-CN.json";
import {
  DEFAULT_LOCALE,
  LocaleContext,
  readStoredLocale,
  writeStoredLocale,
  type Locale,
} from "./store";

/**
 * I18nProvider（plan 004 v6s）。
 *
 * - 服务器端：渲染 DEFAULT_LOCALE（en）的 messages（静态导出 build 时只生成一份 HTML）
 * - 客户端 mount 后：读 localStorage，若非默认则切换 messages 触发整树 rerender
 * - 同时写 cookie `acecrush-locale`，便于后续若改成 SSR-by-cookie 时直接复用
 *
 * v6s：NextIntlClientProvider 必须显式传 timeZone，否则 v6r 仅在 server config 加
 *   timeZone 不足以消除 client 端 useTranslations 触发的 ENVIRONMENT_FALLBACK
 *   警告。值与 i18n/request.ts 保持一致（Asia/Shanghai）。
 *
 * suppressHydrationWarning 在 layout 根 html/body 上由 RootLayout 处理。
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // mount 后从 localStorage 同步一次
  useEffect(() => {
    const stored = readStoredLocale();
    if (stored !== locale) setLocaleState(stored);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 跨标签同步
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== "acecrush-locale") return;
      const v = e.newValue;
      if (v === "zh-CN" || v === "en") setLocaleState(v);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLocale = (next: Locale) => {
    writeStoredLocale(next);
    setLocaleState(next);
  };

  const messages = locale === "zh-CN" ? zhMessages : enMessages;

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="Asia/Shanghai"
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}