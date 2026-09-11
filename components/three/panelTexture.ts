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

  // 背景：深色卡（dark 主题：0x0E1410；light：白）
  ctx.fillStyle = isDark ? "#0E1410" : "#FAFAF6";
  roundedRect(ctx, 0, 0, W, H, 24);
  ctx.fill();

  // 边框
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
  ctx.lineWidth = 2;
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
 * 透明中心 + 四条彩色边框，主题感知：
 *   - dark mode: 浅色边框 + accent 光晕
 *   - light mode: 深色边框 + accent 光晕
 *
 * 返回的 CanvasTexture 透明度：中心 = 0，边框 = 1（+shadow glow 半透明外延）。
 * mesh 用稍大于 panel 的 PlaneGeometry 形成"边框外框"效果。
 *
 * 用户 2026-09-11 v15：边框要清晰醒目（之前 4px 太细看不见）。
 */
export type HighlightBorderOpts = {
  width: number;
  height: number;
  isDark: boolean;
  /** 边框色：dark 模式下浅色，light 模式下深色 */
  borderColor: string;
  /** 内层光晕色（accent），叠在边框内侧 */
  glowColor?: string;
  borderWidth?: number;
};

export function drawHighlightBorder(opts: HighlightBorderOpts): THREE.CanvasTexture {
  const { width: W, height: H, isDark, borderColor, glowColor, borderWidth = 12 } = opts;
  const { c, ctx } = setupCanvas(W, H);

  // 外层：粗边框 + 强光晕（用户 v15：边框要清晰醒目）
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.shadowColor = borderColor;
  ctx.shadowBlur = 28;       // 强光晕
  ctx.lineJoin = "miter";
  ctx.miterLimit = 4;

  // 画四边框（用 rect 的 stroke）
  ctx.beginPath();
  ctx.rect(borderWidth / 2, borderWidth / 2, W - borderWidth, H - borderWidth);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 内层光晕（accent 色）：在边框内侧 12px 处画一条粗线
  if (glowColor) {
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 4;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.rect(
      borderWidth + 10,
      borderWidth + 10,
      W - (borderWidth + 10) * 2,
      H - (borderWidth + 10) * 2
    );
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
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