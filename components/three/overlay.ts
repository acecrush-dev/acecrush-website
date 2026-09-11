/**
 * SVG 折线 tooltip 覆盖层（plan 003 §4-2）。
 *
 * 从 components/brand/TennisBallGlobe.tsx 搬出 SVG tooltip 整段（折线 / clamp / LEADER 逻辑 1:1 一致）。
 *
 * 用法：
 *   const overlay = createTooltipOverlay({ mount, specs, renderLabel });
 *   // host scene 每帧：
 *   const anchors = projectMarkersToScreen(camera, markerGroup, anchors); // host owns projection
 *   overlay.update(width, height, anchors, ballPxR);
 *
 * host 拥有：renderer / camera / markerGroup / marker.getWorldPosition → 投影到屏幕。
 * overlay 只负责：svg 节点创建 + 引线布局 + clamp + 标签 DOM 挂载。
 */

import type { MarkerSpec, MarkerAnchor } from "./tennisBall";

export type OverlayOpts = {
  /** 容器元素（mount），SVG overlay 会作为子元素加入 */
  mount: HTMLElement;
  /** marker 列表（顺序与 svg group 一一对应） */
  specs: MarkerSpec[];
  /** 渲染标签 DOM 节点（hero 用 <a>，hub 用 <button>） */
  renderLabel: (spec: MarkerSpec) => HTMLElement;
};

export type OverlayHandle = {
  /**
   * 每帧调用一次，重算所有 marker 的折线 / 标签位置。
   * @param width 容器宽（CSS px）
   * @param height 容器高（CSS px）
   * @param anchors host scene 投影后的 marker 屏幕坐标（含 facing）
   * @param ballPxR 球面像素半径（用于计算 LEADER 距离 = 0.618 × ballPxR）
   */
  update: (
    width: number,
    height: number,
    anchors: MarkerAnchor[],
    ballPxR: number
  ) => void;
  /** 卸载：移除 svg overlay */
  dispose: () => void;
};

const RADIAL = 14; // marker 边缘的视觉半径（与原版一致）
const FO_H = 56; // tooltip 实际渲染高度（与原版一致）

export function createTooltipOverlay(opts: OverlayOpts): OverlayHandle {
  const { mount, specs, renderLabel } = opts;

  const overlayNS = "http://www.w3.org/2000/svg";
  const overlay = document.createElementNS(overlayNS, "svg") as SVGSVGElement;
  overlay.setAttribute("width", "100%");
  overlay.setAttribute("height", "100%");
  overlay.style.cssText = [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
    "overflow:visible",
  ].join(";");
  mount.appendChild(overlay);

  const overlayGroups: SVGGElement[] = specs.map(() => {
    const g = document.createElementNS(overlayNS, "g");
    overlay.appendChild(g);
    return g;
  });

  const nodes = specs.map((spec, i) =>
    buildTooltipGroup(overlayGroups[i], spec, renderLabel)
  );

  function update(
    width: number,
    height: number,
    anchors: MarkerAnchor[],
    ballPxR: number
  ) {
    const cx = width / 2;
    const cy = height / 2;
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i];
      const node = nodes[i];
      const g = overlayGroups[i];
      if (!a.facing) {
        g.style.display = "none";
        continue;
      }
      g.style.display = "block";
      // 引线方向：从画布中心 (cx, cy) → marker (a.x, a.y) 沿径向延伸
      const dx = a.x - cx;
      const dy = a.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;

      const foW = node.boxW;
      const LEADER = ballPxR * 0.618;

      const edgeX = a.x + ux * RADIAL;
      const edgeY = a.y + uy * RADIAL;
      const labelCenterX = edgeX + ux * LEADER;
      const labelCenterY = edgeY + uy * LEADER;

      let foX = labelCenterX - foW / 2;
      let foY = labelCenterY - FO_H / 2;
      foX = Math.max(4, Math.min(width - foW - 4, foX));
      foY = Math.max(4, Math.min(height - FO_H - 4, foY));

      const nearestX = Math.max(foX, Math.min(edgeX, foX + foW));
      const nearestY = Math.max(foY, Math.min(edgeY, foY + FO_H));

      node.path.setAttribute(
        "d",
        `M ${edgeX.toFixed(1)} ${edgeY.toFixed(1)} ` +
          `L ${nearestX.toFixed(1)} ${nearestY.toFixed(1)}`
      );
      node.endDot.setAttribute("cx", nearestX.toFixed(1));
      node.endDot.setAttribute("cy", nearestY.toFixed(1));

      node.fo.setAttribute("x", foX.toFixed(1));
      node.fo.setAttribute("y", foY.toFixed(1));
      node.fo.setAttribute("width", foW.toFixed(1));
      node.fo.setAttribute("height", FO_H.toString());
    }
  }

  function dispose() {
    if (overlay.parentElement === mount) mount.removeChild(overlay);
  }

  return { update, dispose };
}

/**
 * 在 svg group 内创建 path + endDot + foreignObject 容器 + 标签 DOM。
 * 与原版 buildTooltipGroup 1:1 一致，仅标签 DOM 由 renderLabel 注入。
 */
function buildTooltipGroup(
  g: SVGGElement,
  spec: MarkerSpec,
  renderLabel: (spec: MarkerSpec) => HTMLElement
) {
  g.innerHTML = "";
  const overlayNS = "http://www.w3.org/2000/svg";

  const path = document.createElementNS(overlayNS, "path");
  path.setAttribute("stroke", spec.color);
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("opacity", "0.85");
  g.appendChild(path);

  const endDot = document.createElementNS(overlayNS, "circle");
  endDot.setAttribute("r", "3");
  endDot.setAttribute("fill", spec.color);
  g.appendChild(endDot);

  const fo = document.createElementNS(overlayNS, "foreignObject");
  fo.setAttribute("width", "240");
  fo.setAttribute("height", "60");
  const wrapper = renderLabel(spec);
  fo.appendChild(wrapper);
  g.appendChild(fo);

  const boxW = wrapper.getBoundingClientRect().width || 230;

  return { path, endDot, fo, wrapper, boxW };
}