import { getRequestConfig } from "next-intl/server";
import enMessages from "@/messages/en.json";

/**
 * next-intl 服务端最小配置（plan 004 v6c · 2026-08-23）。
 *
 * v6 整体架构：locale 完全由 client store (localStorage) 管理；server 端静态
 * 导出只生成一份 en 默认 HTML。本文件仅为了让 next-intl 的 getTranslations
 * server API 不抛 "Couldn't find next-intl config file"。
 *
 * - 默认 locale: 'en'（与 lib/i18n/store.ts DEFAULT_LOCALE 一致）
 * - 只导出 en messages（zh-CN 由 I18nProvider client 端按 store 切换）
 * - timeZone: 'Asia/Shanghai'（v6r：消除 next-intl 4.x 的 ENVIRONMENT_FALLBACK
 *   警告；用户群体在境内，避免 UTC 偏 8h 导致未来接入日期格式化时 markup 不匹配）
 *
 * 因为已无 [locale] dynamic 段与 middleware，这里不再有 routing/localePrefix
 * 等概念；plugin (next.config.mjs) 引用本文件以满足构建期校验。
 */
export default getRequestConfig(async () => {
  return {
    locale: "en",
    messages: enMessages,
    timeZone: "Asia/Shanghai",
  };
});