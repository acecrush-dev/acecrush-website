"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { AppNav } from "@/components/layout/AppNav";
import { LocaleLangSync } from "@/components/i18n/LocaleLangSync";

/**
 * LandingContent（plan 001 §4-12 + plan 003 §4-11 + 用户 2026-09-11 转向）。
 *
 * 用户 2026-09-11 转向："放弃 classview 只有 3d 的"。
 *   - 整站只有 3D 沉浸视图（无经典层切换 / 无 mode 概念）
 *   - nav 始终在顶端（AppNav 永远可见）
 *   - WebGL 不可用时显示 3D 错误提示（不再降级到经典页）
 *
 * 组件顺序：LocaleLangSync → skip link → AppNav（永远可见）→ ThreeExperience（动态 ssr:false）
 *   - 3D 模式下 ThreeExperience 全屏 canvas + 房间 nav（AppNav 仍在 z-index 上层）
 *   - no-WebGL 时 ThreeExperience 显示 webglFallback 提示文案
 */

const ThreeExperience = dynamic(
  () =>
    import("@/components/three/ThreeExperience").then(
      (m) => m.ThreeExperience
    ),
  { ssr: false }
);

export function LandingContent() {
  const t = useTranslations("nav");

  return (
    <>
      <LocaleLangSync />
      <a href="#main" className="skip-link">
        {t("skipToContent")}
      </a>
      <AppNav />
      <main id="main">
        <ThreeExperience />
      </main>
    </>
  );
}