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
  /** 用户 v39：可选缩略图路径（URL），绘制在 eyebrow 上方；面板只放图+标题，详细内容走 popup */
  image?: string;
  /** 用户 v39：缩略图 alt 文本（accessibility / tooltip，不绘制到 canvas） */
  imageLabel?: string;
  /** 用户 v50：thumbnail 透明度（0-1），可用于虚化（默认 1）；
   *   位置统一：紧挨着最后一排文字下一行 + 居中（v50 用户反馈"为何那么随机"） */
  thumbnailOpacity?: number;
  /** 用户 v39：预加载好的 HTMLImageElement（RoomScene 在 image 加载完后传回用于重绘） */
  _imageEl?: HTMLImageElement;
  /** 用户 v54：当前 panel 世界尺寸（w / h）。canvas 比例 = panel 比例，
   *   避免文字拉伸变形。 */
  panelW?: number;
  panelH?: number;
};

/**
 * 渲染内容卡纹理（房间面板）。返回 CanvasTexture。
 * 用户 v54：canvas 像素比例 = panel 世界比例（避免拉伸变形）；
 *   panel_H 一定，panel_W 随 viewport 变 → canvas 高度 H_PX 固定，
 *   canvas 宽度 W_PX = H_PX * (panelW / panelH)。
 *   字体大小按 H_PX 缩放（高度恒定 → 字号恒定 → 不拉伸）。
 */
export function drawPanel(opts: PanelOpts): THREE.CanvasTexture {
  const H_PX = 576; // canvas 像素高度（恒定）
  const aspect =
    opts.panelW && opts.panelH
      ? opts.panelW / opts.panelH
      : 2.8 / 1.8; // 默认 16:10（原始 panel 长宽比）
  const W_PX = Math.max(160, Math.round(H_PX * aspect));
  const W = W_PX;
  const H = H_PX;
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

  // 用户 v51：面板 padding + 居中
  //   用户反馈"留足够多的padding content整体放在中间一些"
  //   → padX 加大 + 内容块整体垂直居中（不只 top-anchor）
  //   → 标题稍小一点让块更紧凑
  // 用户 v54：padX 按 canvas 宽度比例缩放（窄 canvas 不留太多 padding）
  //   desktop W=1024 → padX=80；mobile W=207 → padX=16
  const padX = Math.max(16, Math.round(80 * (W / 1024)));
  const titleFontSize = 48; // v51：标题 52→48，让整体更平衡
  const titleLineH = 56; // v51：行高 60→56
  const eyebrowGap = 16;
  const eyebrowH = 24;
  const bodyLineH = 32;
  const imageGap = 16;
  const imageH = 60;

  // 计算每个块的高度，先估算实际渲染行数
  ctx.save();
  ctx.font = `700 ${titleFontSize}px ${FONT_FAMILY}`;
  const titleLinesEst = estimateWrapLines(
    ctx,
    opts.title,
    W - padX * 2
  );
  ctx.restore();
  const titleBlockH = titleLinesEst * titleLineH;

  ctx.save();
  ctx.font = `400 24px ${FONT_FAMILY}`;
  const bodyLinesEst = opts.body
    ? estimateWrapLines(ctx, opts.body, W - padX * 2)
    : 0;
  ctx.restore();
  const bodyBlockH = bodyLinesEst * bodyLineH;

  const hasEyebrow = !!opts.eyebrow;
  const hasImage = !!opts.image;
  // 总内容块高度：title + eyebrowGap + eyebrow + bodyGap + body + imageGap + image
  const innerGap = 8;
  let blockH =
    titleBlockH +
    (hasEyebrow ? eyebrowGap + eyebrowH : 0) +
    (bodyBlockH > 0 ? innerGap + bodyBlockH : 0) +
    (hasImage ? imageGap + imageH : 0);
  // v51：垂直居中（top + bottom padding 各 (H - blockH) / 2，但至少 60 / 60）
  const topPad = Math.max(60, Math.floor((H - blockH) / 2));

  // 1) 标题
  ctx.fillStyle = isDark ? "#F5F5F0" : "#14181A";
  ctx.font = `700 ${titleFontSize}px ${FONT_FAMILY}`;
  ctx.textBaseline = "top";
  let cursorY = topPad;
  const titleLines = wrapText(ctx, opts.title, padX, cursorY, W - padX * 2, titleLineH);
  cursorY += titleLines * titleLineH;

  // 2) eyebrow
  if (opts.eyebrow) {
    cursorY += eyebrowGap;
    ctx.fillStyle = isDark ? "#60A5FA" : "#1D4ED8";
    ctx.font = `500 20px ${FONT_FAMILY}`;
    ctx.fillText(opts.eyebrow, padX, cursorY);
    cursorY += eyebrowH;
  }

  // 3) short body
  if (opts.body) {
    cursorY += innerGap;
    ctx.fillStyle = isDark ? "rgba(245,245,240,0.78)" : "rgba(20,24,26,0.78)";
    ctx.font = `400 24px ${FONT_FAMILY}`;
    const bodyLines = wrapText(ctx, opts.body, padX, cursorY, W - padX * 2, bodyLineH);
    cursorY += bodyLines * bodyLineH;
  }

  // 4) 缩略图（v58：自适应每个面板的剩余空间，不是固定大小）
  //   - 用户反馈："thumbnail再大一些 和下面空间大小成比例"
  //   - imgH 占满剩余可用高度（文字结束 → 面板底部）的大部分
  //   - imgW 按比例（aspect 1.6），不超 canvas 宽度
  //   - 不同 panel 文字长度不同 → 剩余空间不同 → thumbnail 大小自适应
  if (opts.image) {
    cursorY += imageGap;
    const bottomPad = Math.max(40, Math.round(40 * (W / 1024)));
    const availableH = H - cursorY - bottomPad;
    // target 高度：占剩余空间的 80%，但不超过 220，最小 60
    const targetH = Math.max(60, Math.min(availableH * 0.8, 220));
    // 维持 1.6 长宽比
    const THUMB_ASPECT = 1.6;
    let imgH = targetH;
    let imgW = imgH * THUMB_ASPECT;
    const maxW = W - padX * 2;
    // 限制：宽度不能超 canvas
    if (imgW > maxW) {
      imgW = maxW;
      imgH = imgW / THUMB_ASPECT;
    }
    // 限制：高度不能超 availableH（理论上不会，但保险）
    if (imgH > availableH) {
      imgH = availableH;
      imgW = imgH * THUMB_ASPECT;
      if (imgW > maxW) {
        imgW = maxW;
        imgH = imgW / THUMB_ASPECT;
      }
    }
    const thumbOpacity = opts.thumbnailOpacity ?? 1;
    const imgX = (W - imgW) / 2;
    const imgY = cursorY;
    ctx.globalAlpha = thumbOpacity;
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
    roundedRect(ctx, imgX - 4, imgY - 4, imgW + 8, imgH + 8, 10);
    ctx.fill();
    if (opts._imageEl && opts._imageEl.complete && opts._imageEl.naturalWidth > 0) {
      const iw = opts._imageEl.naturalWidth;
      const ih = opts._imageEl.naturalHeight;
      const ratio = Math.min(imgW / iw, imgH / ih);
      const dw = iw * ratio;
      const dh = ih * ratio;
      const dx = imgX + (imgW - dw) / 2;
      const dy = imgY + (imgH - dh) / 2;
      ctx.drawImage(opts._imageEl, dx, dy, dw, dh);
    } else {
      ctx.fillStyle = isDark ? "rgba(245,245,240,0.45)" : "rgba(20,24,26,0.45)";
      ctx.font = `500 16px ${FONT_FAMILY}`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(opts.imageLabel || "preview", imgX + imgW / 2, imgY + imgH / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
    }
    ctx.globalAlpha = 1;
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

/**
 * 用户 v47：在多面体上方画产品名（3D 文字效果）。
 * 返回一张透明背景的文字纹理，用 CanvasTexture 作为 plane mesh 贴在多面体上方。
 * 不引入字体依赖（用系统字体栈），适合产品名这种 1-2 行大字的展示。
 */
export type TextLabelOpts = {
  text: string;
  isDark?: boolean;
  /** 字号 px（默认 96） */
  fontSize?: number;
  /** 字色（默认浅/深） */
  color?: string;
};

export function drawTextLabel(opts: TextLabelOpts): THREE.CanvasTexture {
  const fontSize = opts.fontSize ?? 96;
  const isDark = opts.isDark ?? true;
  const text = opts.text;
  // 尺寸：按文字长度动态估算（每字 ~ fontSize * 0.6 宽度，加 padding）
  const padding = 48;
  const W = Math.max(512, text.length * fontSize * 0.6 + padding * 2);
  const H = fontSize + padding * 2;
  const { c, ctx } = setupCanvas(W, H);

  // 透明背景（不画底）
  ctx.clearRect(0, 0, W, H);

  // 文字（粗体，居中）
  ctx.fillStyle = opts.color ?? (isDark ? "#F5F5F0" : "#14181A");
  ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, W / 2, H / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}

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
/** 用户 v51：估算文字按 maxW 换行后的行数（不动 ctx，只 measureText） */
function estimateWrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number
): number {
  const paras = text.split(/\n/);
  let count = 0;
  for (const para of paras) {
    const words = para.split(/(\s+)/);
    let line = "";
    for (const w of words) {
      const test = line + w;
      const m = ctx.measureText(test);
      if (m.width > maxW && line) {
        count++;
        line = w.trimStart();
      } else {
        line = test;
      }
    }
    if (line) count++;
  }
  return count;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  maxLines?: number
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
        if (maxLines != null && lineCount >= maxLines) break;
        ctx.fillText(line, x, cursorY);
        line = w.trimStart();
        cursorY += lineH;
        lineCount++;
        if (maxLines != null && lineCount >= maxLines) break;
      } else {
        line = test;
      }
    }
    if (line) {
      if (maxLines != null && lineCount >= maxLines) {
        // 已经达到最大行数，不再绘制
      } else {
        ctx.fillText(line, x, cursorY);
        cursorY += lineH;
        lineCount++;
      }
    }
    if (maxLines != null && lineCount >= maxLines) break;
  }
  return lineCount;
}