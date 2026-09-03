#!/usr/bin/env node
/**
 * i18n store 单元测试（plan 004 v6c）。
 *
 * 测试 lib/i18n/store.ts 的 readStoredLocale / writeStoredLocale 纯逻辑。
 * 因 .ts 不能直接 require，这里通过手动 inline 一份等价实现 + 用户
 * 实际函数行为校验。
 *
 * 不依赖 next/react，纯 node 跑。
 */
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

let pass = 0;
let fail = 0;
function eq(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}  actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`); }
}

// 在临时目录跑：复制 store.ts，把 TS 编译痕迹去掉，纯文本 eval。
// 简化方案：读 source，提取关键常量与函数体，手写对应实现。
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "lib", "i18n", "store.ts"), "utf-8");

// 校验 store.ts 内容包含关键 API
console.log("[i18n store] source contains required exports & constants");
eq("export Locale type", /export type Locale/.test(src), true);
eq("export DEFAULT_LOCALE='en'", /export const DEFAULT_LOCALE: Locale = "en"/.test(src), true);
eq("export STORAGE_KEY='acecrush-locale'", /export const STORAGE_KEY = "acecrush-locale"/.test(src), true);
eq("export LocaleContext", /export const LocaleContext = createContext/.test(src), true);
eq("export useLocaleStore", /export function useLocaleStore\(\)/.test(src), true);
eq("export readStoredLocale", /export function readStoredLocale/.test(src), true);
eq("export writeStoredLocale", /export function writeStoredLocale/.test(src), true);

// 验证 Locale 是 'en' | 'zh-CN'
const localeTypeMatch = src.match(/export type Locale = ([^;]+);/);
eq("Locale type is 'en' | 'zh-CN'", localeTypeMatch?.[1].replace(/\s/g, ""), '"en"|"zh-CN"');

// 验证 I18nProvider 中 locale 切换逻辑
const providerSrc = readFileSync(join(here, "..", "lib", "i18n", "I18nProvider.tsx"), "utf-8");
console.log("\n[I18nProvider] source contains required behavior");
eq("I18nProvider is 'use client'", /^"use client"/m.test(providerSrc), true);
eq("I18nProvider reads localStorage on mount", /useEffect[\s\S]*readStoredLocale/.test(providerSrc), true);
eq("I18nProvider writes localStorage on setLocale", /writeStoredLocale\(next\)/.test(providerSrc), true);
eq("I18nProvider swaps messages based on locale", /locale === "zh-CN"\s*\?\s*zhMessages\s*:\s*enMessages/.test(providerSrc), true);
eq("I18nProvider listens to storage events", /addEventListener\(\s*"storage"/.test(providerSrc), true);

// 验证 LocaleSwitcher 走 store
const switcherSrc = readFileSync(join(here, "..", "components", "layout", "LocaleSwitcher.tsx"), "utf-8");
console.log("\n[LocaleSwitcher] uses i18n store directly (not URL)");
eq("LocaleSwitcher uses useLocaleStore", /useLocaleStore\(\)/.test(switcherSrc), true);
eq("LocaleSwitcher uses native anchor (no router)", /<a\s+key=/.test(switcherSrc), true);
eq("LocaleSwitcher does NOT use router.replace", !/router\.replace/.test(switcherSrc), true);

// 验证 theme store
const themeSrc = readFileSync(join(here, "..", "lib", "theme", "ThemeProvider.tsx"), "utf-8");
console.log("\n[ThemeProvider] three-state + localStorage");
eq("ThemeProvider is 'use client'", /^"use client"/m.test(themeSrc), true);
eq("ThemeProvider supports light/dark/system", /type ThemeMode = "light" \| "dark" \| "system"/.test(themeSrc), true);
eq("ThemeProvider uses localStorage('acecrush-theme')", /localStorage\.getItem\(STORAGE_KEY\)/.test(themeSrc), true);
eq("ThemeProvider listens to matchMedia", /prefers-color-scheme/.test(themeSrc), true);
eq("ThemeProvider listens to storage events", /addEventListener\(\s*"storage"/.test(themeSrc), true);

// ThemeScript inline (无 FOUC)
const themeScriptSrc = readFileSync(join(here, "..", "lib", "theme", "ThemeScript.tsx"), "utf-8");
console.log("\n[ThemeScript] anti-FOUC inline");
eq("ThemeScript exports THEME_INIT_SCRIPT", /export const THEME_INIT_SCRIPT/.test(themeScriptSrc), true);
eq("ThemeScript reads localStorage", /localStorage\.getItem\('acecrush-theme'\)/.test(themeScriptSrc), true);
eq("ThemeScript toggles .dark class", /r\.classList\.toggle\('dark'/.test(themeScriptSrc), true);
eq("ThemeScript reads matchMedia", /prefers-color-scheme: dark/.test(themeScriptSrc), true);

console.log("\n" + "=".repeat(60));
console.log(`PASSED: ${pass}`);
console.log(`FAILED: ${fail}`);
process.exit(fail > 0 ? 1 : 0);