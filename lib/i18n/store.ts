"use client";

import { createContext, useContext } from "react";

/**
 * 客户端 i18n store（plan 004 v6 · 2026-08-23）。
 *
 * 设计：类 Pinia 风格的轻量 client-only store（不依赖 next-intl URL routing）。
 * - locale 状态存 React state + localStorage 持久化
 * - 默认 en（用户明确要求）
 * - URL 不带 locale 前缀
 *
 * 服务器端：
 * - 静态导出 build 时只生成一份 HTML（en 默认）
 * - 用户首次访问如已设 zh-CN，client mount 后切到 zh-CN；瞬时 en→zh-CN 闪烁可接受
 * - 用了 suppressHydrationWarning 抑制 mismatch warning
 */

export type Locale = "en" | "zh-CN";

export const DEFAULT_LOCALE: Locale = "en";
export const STORAGE_KEY = "acecrush-locale";

export type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
};

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocaleStore() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocaleStore must be used within <I18nProvider>");
  }
  return ctx;
}

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "zh-CN" ? "zh-CN" : "en";
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function writeStoredLocale(l: Locale) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* storage unavailable - in-memory only */
  }
}