/**
 * CanvasTexture 工厂（plan 003 §4-5）。
 *
 * 提供：
 *   drawPanel({title, eyebrow, body, qaList}) - 圆角深色内容卡
 *   drawButton(label, {hovered, active}) - 圆角 mesh 按钮标签
 *   drawFelt() - 深橄榄内壁噪点（房间内壁贴图）
 *   disposeTexture(tex)
 *
 * 字体：系统栈（与 globals.css 一致），2x 分辨率 + anisotropy 16，中文零依赖。
 */

import * as THREE from "three";

const FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
const DPR = 2; // 2x 绘制以匹配 DPR=2 屏幕

function setupCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w * DPR;
  c.height = h * DPR;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("CanvasTexture: 2d context unavailable");
  ctx.scale(DPR, DPR);
  return { c, ctx };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export type PanelOpts = {
  title: string;
  eyebrow?: string;
  body?: string;
  qaList?: { q: string; a: string }[];
  isDark?: boolean;
  /** 用户 v28：active 状态，背景使用 accent 色而非默认深色 */
  active?: boolean;
  /** 房间 accent 色（active 时背景用） */
  accent?: string;
};

/**
 * 渲染内容卡纹理（房间面板）。返回 CanvasTexture。
 * 尺寸 1024 x 576（接近 16:9，便于在面板 plane 上 lookAt(0,0,0)）。
 */
export function drawPanel(opts: PanelOpts): THREE.CanvasTexture {
  const W = 1024;
  const H = 576;
  const { c, ctx } = setupCanvas(W, H);
  const isDark = opts.isDark ?? true;
  const active = opts.active ?? false;

  // 背景：用户 v34 - 更亮的网球绿（lime / chartreuse，像真的网球 🎾）
  //   dark mode: 亮网球绿 rgba(200, 230, 60, 0.38)（白字高对比，绿感强）
  //   light mode: 更亮网球绿 rgba(200, 230, 60, 0.55)（黑字高对比，绿感强）
  //   inactive: 默认深色 / 浅色
  let bgColor: string;
  if (active) {
    if (isDark) {
      bgColor = "rgba(200, 230, 60, 0.38)";
    } else {
      bgColor = "rgba(200, 230, 60, 0.55)";
    }
  } else {
    bgColor = isDark ? "#0E1410" : "#FAFAF6";
  }
  ctx.fillStyle = bgColor;
  roundedRect(ctx, 0, 0, W, H, 24);
  ctx.fill();

  // 边框（淡），active 时稍亮
  ctx.strokeStyle = active
    ? isDark
      ? "rgba(255,255,255,0.18)"
      : "rgba(0,0,0,0.14)"
    : isDark
      ? "rgba(255,255,255,0.12)"
      : "rgba(0,0,0,0.10)";
  ctx.lineWidth = active ? 2.5 : 2;
  ctx.stroke();

  // eyebrow（小字、accent 蓝/红）：避用 smoke 禁用的科技绿 hex
  let cursorY = 64;
  if (opts.eyebrow) {
    ctx.fillStyle = isDark ? "#60A5FA" : "#1D4ED8";
    ctx.font = `600 22px ${FONT_FAMILY}`;
    ctx.textBaseline = "top";
    ctx.fillText(opts.eyebrow, 48, cursorY);
    cursorY += 36;
  }

  // 标题
  ctx.fillStyle = isDark ? "#F5F5F0" : "#14181A";
  ctx.font = `700 56px ${FONT_FAMILY}`;
  const titleLines = wrapText(ctx, opts.title, 48, cursorY, W - 96, 64);
  cursorY += titleLines * 64 + 28;

  // body
  if (opts.body) {
    ctx.fillStyle = isDark ? "rgba(245,245,240,0.78)" : "rgba(20,24,26,0.78)";
    ctx.font = `400 28px ${FONT_FAMILY}`;
    const bodyLines = wrapText(ctx, opts.body, 48, cursorY, W - 96, 40);
    cursorY += bodyLines * 40 + 24;
  }

  // FAQ 列表
  if (opts.qaList?.length) {
    ctx.fillStyle = isDark ? "rgba(245,245,240,0.55)" : "rgba(20,24,26,0.55)";
    ctx.font = `600 22px ${FONT_FAMILY}`;
    ctx.fillText("FAQ", 48, cursorY);
    cursorY += 32;
    ctx.font = `500 22px ${FONT_FAMILY}`;
    for (const { q, a } of opts.qaList) {
      ctx.fillStyle = isDark ? "#F5F5F0" : "#14181A";
      ctx.fillText("Q. " + q, 48, cursorY);
      cursorY += 30;
      ctx.fillStyle = isDark ? "rgba(245,245,240,0.7)" : "rgba(20,24,26,0.7)";
      ctx.font = `400 20px ${FONT_FAMILY}`;
      const lines = wrapText(ctx, "A. " + a, 48, cursorY, W - 96, 28);
      cursorY += lines * 28 + 12;
      ctx.font = `500 22px ${FONT_FAMILY}`;
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}

export type ButtonOpts = {
  label: string;
  hovered?: boolean;
  active?: boolean;
  isDark?: boolean;
  accent?: string;
};

/**
 * 渲染按钮标签纹理。返回 CanvasTexture。
 * 尺寸 512 x 128（按钮 mesh 是 1 x 0.25 unit plane）。
 */
export function drawButton(opts: ButtonOpts): THREE.CanvasTexture {
  const W = 512;
  const H = 128;
  const { c, ctx } = setupCanvas(W, H);
  const isDark = opts.isDark ?? true;
  const accent = opts.accent ?? "#60A5FA";

  // 背景：圆角矩形
  ctx.fillStyle = opts.hovered
    ? accent
    : isDark
      ? "rgba(255,255,255,0.08)"
      : "rgba(0,0,0,0.06)";
  roundedRect(ctx, 0, 0, W, H, 18);
  ctx.fill();

  // 边框
  ctx.strokeStyle = opts.hovered
    ? accent
    : isDark
      ? "rgba(255,255,255,0.2)"
      : "rgba(0,0,0,0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 文字
  ctx.fillStyle = opts.hovered
    ? "#062310"
    : isDark
      ? "#F5F5F0"
      : "#14181A";
  ctx.font = `600 36px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.label, W / 2, H / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}

/**
 * 渲染内壁 felt 噪点（深橄榄底色）。
 * 球体内壁 SphereGeometry BackSide 使用。
 */
export function drawFelt(): THREE.CanvasTexture {
  const W = 512;
  const H = 256;
  const { c, ctx } = setupCanvas(W, H);

  // 底色：深橄榄
  ctx.fillStyle = "#1a2310";
  ctx.fillRect(0, 0, W, H);

  // 噪点
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 24;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n * 1.2));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n * 0.5));
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * 渲染面板高亮边框纹理（活跃面板用）。
 *
 * 用户 v22：高亮要克制不突兀 → 边框更细 + 半透明 + 不用 accent 内层线。
 * 中心透明 → 内容透出。主题感知（dark/light 不同色）。
 *
 * 返回的 CanvasTexture：中心 = 0（透明），边框 = 半透明 1（柔和）。
 * mesh 用稍大于 panel 的 PlaneGeometry 形成"边框外框"效果。
 */
const PIXEL_RES = 1024;

export type HighlightBorderOpts = {
  /** mesh 宽（world units），仅用于计算 canvas 像素长宽比 */
  width: number;
  /** mesh 高（world units） */
  height: number;
  isDark: boolean;
  /** 边框色：dark 模式下浅色，light 模式下深色（用户 v22 改半透明以柔和） */
  borderColor: string;
  /** 保留兼容但用户 v22 已不用（避免 swing 红边框突兀） */
  glowColor?: string;
  borderWidth?: number;
};

export function drawHighlightBorder(opts: HighlightBorderOpts): THREE.CanvasTexture {
  const { width, height, borderColor, borderWidth = 8 } = opts;

  const aspect = height / width;
  const W = PIXEL_RES;
  const H = Math.round(W * aspect);
  const { c, ctx } = setupCanvas(W, H);

  // 用户 v22：边框更细 (~0.7% 宽度 @ 1024 ≈ 7px)，半透明
  const borderPx = Math.max(4, Math.round(W * 0.007));

  // 边框颜色半透明处理（如果传入纯色，注入 alpha 0.55）
  const softColor = injectAlpha(borderColor, 0.55);

  // 单层细边框，无 accent 内层线（用户 v22: 红色太突兀，移除）
  ctx.strokeStyle = softColor;
  ctx.lineWidth = borderPx;
  ctx.lineJoin = "miter";
  ctx.miterLimit = 4;

  ctx.beginPath();
  ctx.rect(borderPx / 2, borderPx / 2, W - borderPx, H - borderPx);
  ctx.stroke();

  // glowColor 参数保留兼容但不绘制（用户 v22 移除 accent 内层线）
  void opts.glowColor;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}

/** 给 CSS 颜色字符串注入/覆盖 alpha（用于半透明边框） */
function injectAlpha(color: string, alpha: number): string {
  // 处理 rgb(...) 格式
  const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(",").map((s) => s.trim());
    const [r, g, b] = parts;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  // 处理 #rrggbb 格式
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

export function disposeTexture(tex: THREE.Texture | undefined | null) {
  if (tex) tex.dispose();
}

/**
 * 多行文本换行（返回行数）。支持 \n 强制换行 + 自动按 maxW 折行。
 * 用 ctx.font 测量文字宽度（调用方负责设 font）。
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number
): number {
  const paras = text.split(/\n/);
  let cursorY = y;
  let lineCount = 0;
  for (const para of paras) {
    const words = para.split(/(\s+)/);
    let line = "";
    for (const w of words) {
      const test = line + w;
      const m = ctx.measureText(test);
      if (m.width > maxW && line) {
        ctx.fillText(line, x, cursorY);
        line = w.trimStart();
        cursorY += lineH;
        lineCount++;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, x, cursorY);
      cursorY += lineH;
      lineCount++;
    }
  }
  return lineCount;
}