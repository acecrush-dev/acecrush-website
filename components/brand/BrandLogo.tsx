import * as React from "react";

/**
 * BrandLogo — 006 v6 主题感知 + 长宽比严格保形（与 App AppLogo 统一）
 *
 * 用户 2026-08-25 反馈 v5：白底容器把 logo 球体的宽度压窄了。
 * v6 修复：
 *   - 用 `display: inline-block` 替代 `inline-flex`（避免 flex shrink 干扰图像尺寸）
 *   - 容器 `box-sizing: border-box` + 显式 width/height = img size + 2*padding（无歧义）
 *   - 图像显式 width/height 属性 + maxWidth/maxHeight: none 防止外部约束
 *   - 移除全局 CSS `.brand-logo-wrapper` 样式依赖，全部 inline-style 化
 *
 * 设计：
 *   - 容器总尺寸 = `size + 2 * padding`（默认 32 + 2*4 = 40 px）
 *   - 内部 padding = 4 px 每边 → img 可用区 = 32×32
 *   - 图像 `width=size height=size` 显式指定 = 32×32，与源 PNG 256×256 同比例
 *   - 白色 bg + 8 px 圆角，dark/light 都一样（v5 决定）
 *
 * props：
 *   - size: img 像素尺寸（默认 32）
 *   - className: 透传外层 div
 *   - alt: a11y，默认 "AceCrush Craft"
 */
export interface BrandLogoProps {
  size?: number;
  className?: string;
  alt?: string;
}

export function BrandLogo({
  size = 32,
  className,
  alt = "AceCrush Craft",
}: BrandLogoProps) {
  const PAD = 4;
  const RAD = 8;
  const totalSize = size + PAD * 2;
  return (
    <div
      className={className}
      style={{
        display: "inline-block",
        width: totalSize,
        height: totalSize,
        padding: PAD,
        background: "#ffffff",
        borderRadius: RAD,
        boxSizing: "border-box",
        lineHeight: 0,
        verticalAlign: "middle",
      }}
    >
      <img
        src="/logo.png"
        width={size}
        height={size}
        alt={alt}
        style={{
          display: "block",
          width: size,
          height: size,
          maxWidth: "none",
          maxHeight: "none",
        }}
      />
    </div>
  );
}