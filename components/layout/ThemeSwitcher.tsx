"use client";

// plan 001 §4-16（附录 B1 bundle-barrel-imports）：原先从 `@phosphor-icons/react`
// barrel 入口 import，会把整包图标拖进依赖图；改走 `/dist/ssr` 子路径，与
// 其余所有组件一致。
import { Moon, Sun, SunHorizon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { useTheme, type ThemeMode } from "@/lib/theme/ThemeProvider";

/**
 * ThemeSwitcher - 三态 segmented control（plan 004 v4 §3）。
 * light / dark / system 三个按钮，aria-pressed 标记当前态。
 */
const OPTIONS: { mode: ThemeMode; Icon: typeof Sun; labelKey: "light" | "dark" | "system" }[] = [
  { mode: "light", Icon: Sun, labelKey: "light" },
  { mode: "system", Icon: SunHorizon, labelKey: "system" },
  { mode: "dark", Icon: Moon, labelKey: "dark" },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useTheme();
  const t = useTranslations("theme");
  const tNav = useTranslations("nav");
  return (
    <div
      className="theme-seg"
      role="group"
      aria-label={tNav("themeLabel")}
      style={compact ? { padding: 2 } : undefined}
    >
      {OPTIONS.map(({ mode: m, Icon, labelKey }) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={active}
            aria-label={t(labelKey)}
            title={t(labelKey)}
            onClick={() => setMode(m)}
            style={compact ? { width: 28, height: 28 } : undefined}
          >
            <Icon size={14} weight={active ? "fill" : "regular"} />
          </button>
        );
      })}
    </div>
  );
}