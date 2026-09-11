"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocaleStore, type Locale } from "@/lib/i18n/store";

/**
 * LocaleSwitcher - zh-CN / en 切换（plan 001 + 用户 2026-09-11 多次迭代）。
 *
 * 用户 2026-09-11 v4：3D 立方体点击无效（backface-visibility/pointer-events 问题），
 * 换成简洁按钮 + 下拉菜单，所有设备都用同一组件：
 *   - 触发按钮显示当前 locale（EN / 中）+ 小箭头
 *   - 点击展开下拉菜单（fade + slide-down 动画）
 *   - 选项点击后立即切换 + 关闭
 *   - 点击外部 / Esc 关闭
 *   - 紧贴 ThemeSwitcher（gap-0.5）
 */
const OPTIONS: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "zh-CN", label: "中文" },
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

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocaleStore();
  const t = useTranslations("nav");
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const currentLabel = locale === "en" ? "EN" : "中";

  // Esc 关闭 + 点击外部关闭
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

  // 移动端：屏幕居中 popup（与之前一致）
  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className="nav-btn-3d nav-btn-mini"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={t("localeLabel")}
          onClick={() => setOpen((v) => !v)}
        >
          {currentLabel}
        </button>
        {open && (
          <div className="popup-overlay" role="presentation">
            <div
              className="popup-card popup-card-locale"
              role="dialog"
              aria-modal="true"
              aria-label={t("localeLabel")}
            >
              <h3 className="popup-title">{t("localeLabel")}</h3>
              <div className="popup-options">
                {OPTIONS.map((o) => (
                  <button
                    key={o.code}
                    type="button"
                    className="popup-option"
                    aria-pressed={o.code === locale}
                    onClick={() => {
                      setLocale(o.code);
                      setOpen(false);
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 桌面端：触发按钮 + 下拉菜单（替代之前不可点击的 3D 立方体）
  return (
    <div ref={wrapRef} className="nav-dropdown">
      <button
        type="button"
        className="nav-btn-3d nav-btn-switcher"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("localeLabel")}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="nav-btn-switcher-label">{currentLabel}</span>
        <span className="nav-btn-switcher-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="nav-dropdown-menu" role="listbox" aria-label={t("localeLabel")}>
          {OPTIONS.map((o) => (
            <button
              key={o.code}
              type="button"
              role="option"
              aria-selected={o.code === locale}
              className="nav-dropdown-item"
              onClick={() => {
                setLocale(o.code);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}