"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

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
  const root = document.documentElement;
  root.classList.toggle("dark", actual === "dark");
  // 同时更新 meta theme-color，让浏览器 chrome 配色跟主题走
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", actual === "dark" ? "#0F1A12" : "#FAFAF6");
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

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return ctx;
}