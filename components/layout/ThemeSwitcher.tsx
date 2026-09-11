"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun, SunHorizon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { useTheme, type ThemeMode } from "@/lib/theme/ThemeProvider";

/**
 * ThemeSwitcher - 三态切换（plan 001 + 用户 2026-09-11 多次迭代）。
 *
 * 用户 2026-09-11 v4：3D 立方体点击无效，换成简洁按钮 + 下拉：
 *   - 触发按钮显示当前主题图标（Sun / SunHorizon / Moon）+ 小箭头
 *   - 点击展开下拉菜单（fade + slide-down 动画）
 *   - 选项点击后立即切换 + 关闭
 *   - 点击外部 / Esc 关闭
 *   - 紧贴 LocaleSwitcher（gap-0.5）
 */
const OPTIONS: { mode: ThemeMode; Icon: typeof Sun; labelKey: "light" | "dark" | "system" }[] = [
  { mode: "light", Icon: Sun, labelKey: "light" },
  { mode: "system", Icon: SunHorizon, labelKey: "system" },
  { mode: "dark", Icon: Moon, labelKey: "dark" },
];

function useIsMobile(breakpoint = 1024) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);
  return mobile;
}

export function ThemeSwitcher() {
  const { mode, setMode } = useTheme();
  const t = useTranslations("theme");
  const tNav = useTranslations("nav");
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const current = OPTIONS.find((o) => o.mode === mode) ?? OPTIONS[0];
  const CurrentIcon = current.Icon;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  // 移动端：屏幕居中 popup
  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className="nav-btn-3d nav-btn-mini"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={tNav("themeLabel")}
          onClick={() => setOpen((v) => !v)}
        >
          <CurrentIcon size={16} weight="fill" aria-hidden />
        </button>
        {open && (
          <div className="popup-overlay" role="presentation">
            <div
              className="popup-card popup-card-theme"
              role="dialog"
              aria-modal="true"
              aria-label={tNav("themeLabel")}
            >
              <h3 className="popup-title">{tNav("themeLabel")}</h3>
              <div className="popup-options">
                {OPTIONS.map(({ mode: m, Icon: I, labelKey }) => (
                  <button
                    key={m}
                    type="button"
                    className="popup-option"
                    aria-pressed={m === mode}
                    onClick={() => {
                      setMode(m);
                      setOpen(false);
                    }}
                  >
                    <I size={20} weight={m === mode ? "fill" : "regular"} aria-hidden />
                    <span>{t(labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 桌面端：触发按钮 + 下拉
  return (
    <div ref={wrapRef} className="nav-dropdown">
      <button
        type="button"
        className="nav-btn-3d nav-btn-switcher"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={tNav("themeLabel")}
        onClick={() => setOpen((v) => !v)}
      >
        <CurrentIcon size={16} weight="fill" aria-hidden />
        <span className="nav-btn-switcher-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="nav-dropdown-menu" role="listbox" aria-label={tNav("themeLabel")}>
          {OPTIONS.map(({ mode: m, Icon: I, labelKey }) => (
            <button
              key={m}
              type="button"
              role="option"
              aria-selected={m === mode}
              className="nav-dropdown-item"
              onClick={() => {
                setMode(m);
                setOpen(false);
              }}
            >
              <I size={16} weight={m === mode ? "fill" : "regular"} aria-hidden />
              <span>{t(labelKey)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}