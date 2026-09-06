"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * 三态主题 provider（plan 004 v6f · 2026-08-23）。
 * - 'light' | 'dark' | 'system'
 * - 默认 'dark'（用户明确要求 localStorage 空时进 dark 模式，不再跟 OS）
 * - 持久化到 localStorage('acecrush-theme')
 * - 实际 class 由 public/theme-init.js ant-flicker inline script
 *   在 hydration 前先设置一次；Provider 仅负责 mount 后状态同步 + 切换写入
 *
 * Tailwind 用 @custom-variant dark 与 .dark class 联动（globals.css），
 * 不依赖 prefers-color-scheme 内置。
 */
export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "acecrush-theme";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  /** 当前实际渲染的类（system 时跟随 OS） */
  resolved: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemPref(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyClass(actual: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", actual === "dark");
  // plan 001 §4-21（附录 A8）：此处原本还直写 meta[name="theme-color"] 的
  // content。三方冲突：app/layout.tsx 的 Viewport.themeColor 已经输出了
  // light/dark 两条带 media query 的 meta，浏览器会自动按系统配色挑一条；
  // 这里再 querySelector 第一条硬写 content，等于覆盖掉 media 语义。
  // 而且写入的 hex #0F1A12 是 v5 调色前的旧值（现为 #0E1410）。
  // 直接删掉，只留 .dark class 切换，配色交给 Viewport meta。
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 初始 state 必须与服务端一致以避免 hydration mismatch：
  // 默认 'dark'（v6f：localStorage 无值时直接进 dark，不再跟 OS）
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [systemPref, setSystemPref] = useState<"light" | "dark">("dark");

  // mount 时从 localStorage 读取并启动监听
  useEffect(() => {
    let stored: ThemeMode | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "light" || raw === "dark" || raw === "system") stored = raw;
    } catch {
      /* localStorage may be unavailable (private mode etc.) - silently ignore */
    }
    if (stored && stored !== mode) {
      setModeState(stored);
    }

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystem = () => setSystemPref(mql.matches ? "dark" : "light");
    updateSystem();
    mql.addEventListener("change", updateSystem);
    return () => mql.removeEventListener("change", updateSystem);
  }, []);

  // 每次 mode/systemPref 变化都同步到 <html>
  useEffect(() => {
    const actual = mode === "system" ? systemPref : mode;
    applyClass(actual);
  }, [mode, systemPref]);

  // 跨标签同步：监听 storage 事件
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      const v = e.newValue;
      if (v === "light" || v === "dark" || v === "system") {
        setModeState(v);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* storage unavailable - mode is still in-memory for this tab */
    }
  }, []);

  const resolved = mode === "system" ? systemPref : mode;

  // plan 001 §4-21（附录 B7 rerender-memo）：context value 原先是内联对象字面量，
  // 每次 ThemeProvider 渲染都产生新引用，害得整棵消费树无条件重渲染。
  const value = useMemo<ThemeContextValue>(
    () => ({ mode, setMode, resolved }),
    [mode, setMode, resolved]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return ctx;
}