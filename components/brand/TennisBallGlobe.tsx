"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * TennisBallGlobe - Three.js 交互式网球 🎾 地球（用户 2026-09-07 追加）。
 *
 * 设计：白底 + 弯曲接缝 + 绒毛噪点的程序化网球纹理贴在球面上，
 * 两个产品 marker（Craft + Swing Analysis）固定在球面坐标上。
 * 用户可鼠标拖动旋转（OrbitControls），光标悬停 marker 时弹 tooltip。
 *
 * 性能 / a11y：
 *   - DPR 限制到 2，避免 Retina 屏过度采样
 *   - 不用 shadow / environment map（这个场景不需要）
 *   - prefers-reduced-motion：关闭 auto-rotate
 *   - canvas role="img" + aria-label 提供无障碍 fallback
 *   - WebGL 不可用时显示静态 fallback（CSS tennis ball emoji + 提示文案）
 *
 * 安全清理：组件卸载时 dispose 掉 geometry / material / texture / renderer。
 */

type MarkerSpec = {
  /** 球面经度（deg），正负表示东西半球 */
  lon: number;
  /** 球面纬度（deg），正负表示南北半球 */
  lat: number;
  /** marker 颜色（CSS 变量 / 颜色字符串皆可） */
  color: string;
  /** tooltip 文案 */
  label: string;
  /** tooltip 副标题（一行小字） */
  sub: string;
};

type MarkerAnchor = {
  x: number;
  y: number;
  facing: boolean;
  spec: MarkerSpec;
};

// 用户 2026-09-07：两个 marker 必须用不同颜色（避免看起来一样）。
// 避开 smoke 禁用的科技绿（accent / dark-accent / dark-accent-2 / dark-accent-3 的 hex 字面）。
const MARKERS: MarkerSpec[] = [
  {
    lon: -55,
    lat: 18,
    color: "#2563EB", // blue
    label: "AceCrush Craft",
    sub: "Android · grip + stringing",
  },
  {
    lon: 65,
    lat: 22,
    color: "#DC2626", // red
    label: "Swing Analysis",
    sub: "Desktop · auto segmentation",
  },
];

export function TennisBallGlobe({
  ariaLabel,
  height = 360,
}: {
  ariaLabel: string;
  /**
   * canvas 像素高度。
   * 传数字 = 固定像素高度；传 "100%" = 跟随父容器高度（用于响应式场景）。
   */
  height?: number | string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // WebGL 可用性探测 - 失败就直接走 fallback（CSS 部分）。
    const probe = document.createElement("canvas");
    const gl =
      probe.getContext("webgl2") || probe.getContext("webgl");
    if (!gl) {
      mount.dataset.fallback = "1";
      return;
    }

    const width = mount.clientWidth;
    // height: 数字 = 固定 px；"100%" = 跟随父容器 clientHeight
    const resolvedHeight =
      typeof height === "number"
        ? height
        : Math.max(240, mount.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const scene = new THREE.Scene();
    // plan 002：场景背景改为深灰（参考 0x111111）
    scene.background = new THREE.Color(0x111111);

    // plan 002：相机取景按参考等比 ×1.5 映射（near 0.01, position (0, 0.225, 4.8)）。
    // 用户 2026-09-07：
    //   - 球稍小 → 拉远到 5.6
    //   - 移动端不能显示不全 → 相机距离根据 canvas 宽高比自适应，
    //     窄屏（aspect < 1）拉得更远一些，球完整出现在画面内 + 留出文字空间
    const aspect = width / resolvedHeight;
    // 宽屏（桌面 16:9 ≈ 1.78）→ 5.6；方屏（1:1）→ ~7.0；窄屏（mobile 9:16 ≈ 0.56）→ ~8.5
    const camZ = 5.6 + Math.max(0, (1 - aspect)) * 4.5;
    const camera = new THREE.PerspectiveCamera(
      45,
      aspect,
      0.01,
      100
    );
    camera.position.set(0, 0.225, camZ);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, resolvedHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // v5.2：参考实现的阴影配置
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", ariaLabel);

    // 球体几何 - 真实网球接缝（用户 2026-09-07 给出参考实现）：
    //   Hirano/Alexander 网球曲线（球面闭曲线） + 沿曲线高斯凹槽 + 白线 ribbon。
    //   两条接缝分别在 Y 轴 0° 与 90° 位置，相位差 90°。
    //   seamGroup 是 sphere 的子节点，自动跟随旋转。
    const BALL_R = 1.5;
    const { sphere } = buildBallWithSeams(BALL_R, scene);

    // 用户 2026-09-07：网球颜色太亮 / 光线过强 → 调暗到 1.0/1.8/0.4；
    // 之后再追调"光线稍微增强一些"（hemi 1.0→1.4 / keyLight 1.8→2.4 / fillLight 0.4→0.7），
    // 球面色维持 0x7d8c0a（深橄榄绿，不刺眼）。
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1.4);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(3, 4, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
    fillLight.position.set(-4, 1, -3);
    scene.add(fillLight);

    // plan 002：地面平面（参考实现 10×10 等比 ×1.5 = 15×15，y=-1.25 ×1.5）
    const groundGeometry = new THREE.PlaneGeometry(15, 15);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x202020,
      roughness: 1,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.875;
    ground.receiveShadow = true;
    scene.add(ground);

    // plan 002：OrbitControls 替换手写 pointer 拖拽（阻尼 + 缩放）
    // 用户 2026-09-07：
    //   - 松开鼠标后立即恢复自转（不等 3s，不要"失焦才转"）
    //   - 滚轮 zoom in/out 不需要，禁用（避免劫持页面滚动 + 移动端 pinch 不必要）
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false; // 禁用滚轮缩放 + 移动端 pinch zoom
    controls.minDistance = 2.7;
    controls.maxDistance = 9;
    controls.addEventListener("start", () => {
      autoRotate = false;
    });
    controls.addEventListener("end", () => {
      autoRotate = true;
    });

    // 两个产品 marker（小球 + 屏幕坐标 tooltip 锚点）
    const markerGroup = new THREE.Group();
    const tooltipAnchors: MarkerAnchor[] = [];

    for (const spec of MARKERS) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 24, 24),
        new THREE.MeshBasicMaterial({ color: spec.color })
      );
      // 经度转 θ（绕 y 轴），纬度转 φ（从北极起）
      const phi = (90 - spec.lat) * (Math.PI / 180);
      const theta = (spec.lon + 180) * (Math.PI / 180);
      const r = BALL_R + 0.01; // 略大于球面半径，避免 z-fighting
      m.position.set(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      markerGroup.add(m);
      tooltipAnchors.push({ x: 0, y: 0, facing: false, spec });
    }
    scene.add(markerGroup);

    // plan 002：手写拖拽已删除（替换为 OrbitControls）；仅保留自转状态机。
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let rotY = 0;
    let autoRotate = !reduce;
    renderer.domElement.style.cursor = "grab";

    // 渲染循环
    let raf = 0;

    // - SVG 折线 tooltip 覆盖层 -
    // 用户 2026-09-07：正面（朝相机）的 marker **持续显示** tooltip，
    // 并从 marker 引一条折线到画布外的标签。
    // 结构：每个 marker 一个 <g class="marker-tooltip">，里面 <path>（折线）+ <foreignObject>（HTML 标签）。
    // 朝向相机的判定：marker 世界坐标点积 camera 视线方向 > 0。
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

    const overlayGroups: SVGGElement[] = MARKERS.map(() => {
      const g = document.createElementNS(overlayNS, "g");
      overlay.appendChild(g);
      return g;
    });

    function buildTooltipGroup(g: SVGGElement, spec: MarkerSpec) {
      g.innerHTML = "";
      // 折线（path）
      const path = document.createElementNS(overlayNS, "path");
      path.setAttribute("stroke", spec.color);
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("opacity", "0.85");
      g.appendChild(path);

      // 折线终点的小圆点
      const endDot = document.createElementNS(overlayNS, "circle");
      endDot.setAttribute("r", "3");
      endDot.setAttribute("fill", spec.color);
      g.appendChild(endDot);

      // 标签（foreignObject 容许 HTML，方便走 design tokens）
      const fo = document.createElementNS(overlayNS, "foreignObject");
      fo.setAttribute("width", "200");
      fo.setAttribute("height", "56");
      const wrapper = document.createElement("div");
      wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
      // plan 002 用户 2026-09-07：tooltip 配色强对比
      //   - 在 dark 主题（html.dark）下：白底黑字
      //   - 在 light 主题下：黑底白字
      // 用 inline 颜色而非 CSS var，避免被站点其它 token 覆盖。
      const isDark = document.documentElement.classList.contains("dark");
      const bg = isDark ? "#ffffff" : "#0a0a0a";
      const fg = isDark ? "#0a0a0a" : "#ffffff";
      const subColor = isDark ? "rgba(10,10,10,0.62)" : "rgba(255,255,255,0.7)";
      const borderColor = isDark
        ? "rgba(10,10,10,0.08)"
        : "rgba(255,255,255,0.18)";
      const shadow = isDark
        ? "0 6px 20px rgba(255,255,255,0.35)"
        : "0 6px 20px rgba(0,0,0,0.55)";
      wrapper.style.cssText = [
        "padding:6px 10px",
        "border-radius:8px",
        `background:${bg}`,
        `border:1px solid ${borderColor}`,
        `box-shadow:${shadow}`,
        "font-size:12px",
        "line-height:1.35",
        `color:${fg}`,
        "display:inline-block",
        "white-space:nowrap",
      ].join(";");
      const dot = document.createElement("span");
      dot.style.cssText = [
        "display:inline-block",
        "width:8px",
        "height:8px",
        "border-radius:50%",
        "margin-right:6px",
        "vertical-align:middle",
        `background:${spec.color}`,
      ].join(";");
      const label = document.createElement("span");
      label.style.cssText = "font-weight:600";
      label.textContent = spec.label;
      const sub = document.createElement("div");
      sub.style.cssText = `color:${subColor};font-size:11px;margin-top:2px;padding-left:14px`;
      sub.textContent = spec.sub;
      wrapper.appendChild(dot);
      wrapper.appendChild(label);
      wrapper.appendChild(sub);
      fo.appendChild(wrapper);
      g.appendChild(fo);

      return { path, endDot, fo, wrapper };
    }

    const tooltipNodes = MARKERS.map((spec, i) =>
      buildTooltipGroup(overlayGroups[i], spec)
    );

    function projectMarkers() {
      // 把 3D marker 坐标投影到屏幕像素坐标（相对 overlay 容器）
      const v = new THREE.Vector3();
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      for (let i = 0; i < tooltipAnchors.length; i++) {
        const m = markerGroup.children[i] as THREE.Mesh;
        // 世界坐标：考虑 sphere 与 markerGroup 旋转
        const world = new THREE.Vector3();
        m.getWorldPosition(world);
        v.copy(world).project(camera);
        // z > 1 = 在相机远平面之外（背面）
        const facing = world.dot(camDir) < 0; // camDir 指向相机身后，朝向相机的点在 camDir 反方向
        tooltipAnchors[i].x = ((v.x + 1) / 2) * width;
        tooltipAnchors[i].y = ((1 - v.y) / 2) * resolvedHeight;
        tooltipAnchors[i].facing = facing;
      }
    }

    function updateOverlays() {
      const cx = width / 2;
      const cy = resolvedHeight / 2;
      for (let i = 0; i < tooltipAnchors.length; i++) {
        const a = tooltipAnchors[i];
        const node = tooltipNodes[i];
        const g = overlayGroups[i];
        if (!a.facing) {
          // 球背面的 marker 隐藏整组
          g.style.display = "none";
          continue;
        }
        g.style.display = "block";
        // 引线方向：从球心 (cx, cy) → marker (a.x, a.y) 沿径向延伸
        const dx = a.x - cx;
        const dy = a.y - cy;
        const d = Math.hypot(dx, dy) || 1;
        const ux = dx / d;
        const uy = dy / d;
        // 折线拐点：marker 半径 8px 之外 + 一个水平/垂直方向延伸
        const lineStart = { x: a.x + ux * 8, y: a.y + uy * 8 };
        // 拐点方向：偏好朝画布外（左 / 右 / 上 / 下），按 marker 方位选最大分量
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        const LABEL_OFFSET = 90; // 标签中心距离 marker 的距离
        let endX: number;
        let endY: number;
        if (absX > absY) {
          // 左右延伸
          endX = a.x + Math.sign(dx) * LABEL_OFFSET;
          endY = a.y;
        } else {
          // 上下延伸
          endX = a.x;
          endY = a.y + Math.sign(dy) * LABEL_OFFSET;
        }
        // 折线：marker → 拐点 1 → 拐点 2 → 标签
        const bend1 = { x: lineStart.x + (endX - lineStart.x) * 0.5, y: lineStart.y };
        const bend2 = { x: endX, y: lineStart.y + (endY - lineStart.y) * 0.5 };
        node.path.setAttribute(
          "d",
          `M ${lineStart.x.toFixed(1)} ${lineStart.y.toFixed(1)} ` +
            `L ${bend1.x.toFixed(1)} ${bend1.y.toFixed(1)} ` +
            `L ${bend2.x.toFixed(1)} ${bend2.y.toFixed(1)} ` +
            `L ${endX.toFixed(1)} ${endY.toFixed(1)}`
        );
        node.endDot.setAttribute("cx", endX.toFixed(1));
        node.endDot.setAttribute("cy", endY.toFixed(1));

        // foreignObject 定位：标签盒以 endX/endY 为参考点
        // 文本方向：marker 在右 → 标签锚左；marker 在左 → 标签锚右
        const foW = 200;
        const foH = 56;
        let foX: number;
        let foY: number;
        if (dx >= 0) {
          // marker 在右半，标签在 marker 右侧 → foX 紧贴 endX + 8
          foX = endX + 8;
        } else {
          // marker 在左半，标签在 marker 左侧 → foX 紧贴 endX - foW - 8
          foX = endX - foW - 8;
        }
        // 垂直居中于 endY
        foY = Math.max(0, Math.min(resolvedHeight - foH, endY - foH / 2));
        node.fo.setAttribute("x", foX.toFixed(1));
        node.fo.setAttribute("y", foY.toFixed(1));
        node.fo.setAttribute("width", foW.toString());
        node.fo.setAttribute("height", foH.toString());
      }
    }

    function loop() {
      raf = requestAnimationFrame(loop);
      // 用户 2026-09-07：自转状态完全由 OrbitControls.start/end 切换。
      //   start → autoRotate=false（拖拽时停转）
      //   end   → autoRotate=true（松手立即恢复）
      // 不再有 3s 无交互定时器。
      if (autoRotate) rotY += 0.0025;
      // plan 002：球体只绕 Y 自转（X 由 OrbitControls 的 polar angle 控制）
      sphere.rotation.y = rotY;
      // 接缝 ribbon 是 sphere 的子节点（跟随旋转）
      markerGroup.rotation.copy(sphere.rotation);
      // plan 002：OrbitControls 阻尼必需在每次渲染前调用 update()
      controls.update();
      renderer.render(scene, camera);
      projectMarkers();
      updateOverlays();
    }

    // 鼠标 hover 探测（用 screen-space 距离阈值，仅用于改变 cursor 反馈，
    // 不再驱动 tooltip 显隐 - 朝向相机的 tooltip 始终显示）
    let hovered = -1;
    function onPointerMoveHover(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let best = -1;
      let bestD = 24;
      for (let i = 0; i < tooltipAnchors.length; i++) {
        const a = tooltipAnchors[i];
        if (!a.facing) continue;
        const dx = a.x - mx;
        const dy = a.y - my;
        const d = Math.hypot(dx, dy);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best !== hovered) {
        hovered = best;
        renderer.domElement.style.cursor = best >= 0 ? "pointer" : "grab";
      }
    }
    renderer.domElement.addEventListener("pointermove", onPointerMoveHover);

    // 自适应窗口尺寸：mode="100%" 时跟随父容器高度（移动端响应式）。
    // 同时根据新 aspect 重新调整相机距离，让球在所有屏幕比例下都完整显示。
    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h =
        typeof height === "number" ? height : Math.max(240, mount.clientHeight);
      renderer.setSize(w, h, false);
      const newAspect = w / h;
      camera.aspect = newAspect;
      camera.position.set(0, 0.225, 5.6 + Math.max(0, 1 - newAspect) * 4.5);
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      // plan 002：手写 pointer-drag 监听器已删除，只剩 hover cursor
      renderer.domElement.removeEventListener(
        "pointermove",
        onPointerMoveHover
      );
      // plan 002：释放 OrbitControls + 地面资源
      controls.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
      // buildBallWithSeams 已经把 sphere 和 seamGroup 加进 scene；
      // 卸载时 scene.dispose() 由后续 cleanup 处理，这里只释放 marker。
      for (const c of markerGroup.children) {
        const m = c as THREE.Mesh;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      renderer.dispose();
      if (overlay.parentElement === mount) mount.removeChild(overlay);
      if (renderer.domElement.parentElement === mount)
        mount.removeChild(renderer.domElement);
    };
  }, [ariaLabel, height]);

  return (
    <div
      ref={mountRef}
      className="tennis-ball-globe"
      style={{
        position: "relative",
        width: "100%",
        height,
        // 用户 2026-09-07：去掉径向渐变 + 圆角 + 阴影。
        // 整个容器透明，WebGL canvas 自己渲染球；WebGL 不可用时
        // 由 useEffect 写入 data-fallback="1"，下方 css fallback 兜底显示 🎾。
        background: "transparent",
        overflow: "visible",
      }}
      data-fallback="0"
    />
  );
}

/**
 * 真实网球接缝几何建模（用户 2026-09-07 给出参考实现并已在浏览器验证）：
 *
 *   Hirano / Alexander 网球曲线（球面闭曲线，数学证明 x²+y²+z² = R²）：
 *     x(t) = a·cos(t) + b·cos(3t)
 *     y(t) = a·sin(t) - b·sin(3t)
 *     z(t) = 2·√(ab)·sin(2t)
 *
 *   取 b = a/3，R = a + b = 4a/3，所以 a = 3R/4、b = R/4。
 *
 *   参考实现只用**一条** Hirano 曲线（不旋转、不复制），绕 Y 轴呈现一个
 *   3D 8 字形（在球面正面看像 S 形从北极到南极再回来），自然经过两极。
 *
 *   渲染：
 *     - 球体顶点沿曲线方向做高斯凹槽（depth 0.045R，width 0.075R）
 *     - 曲线中心位置（凹槽底 75% 深度）放白色 ribbon（width 0.018R）
 *
 *   不是贴图，是真实 3D 几何，所以旋转 / 光照 / 投影都自然。
 *
 * v5.1：用户反馈"v5 完全不对，参考代码在浏览器验证过"。
 *   我在 v5 自作主张加了第二条绕 Y 轴旋转 90° 的 seam（"两条子午线大圆"），
 *   参考代码里**没有**。撤掉多余 seam，严格 1:1 复刻参考实现。
 */
function buildBallWithSeams(
  R: number,
  scene: THREE.Scene
): { sphere: THREE.Mesh; seamGroup: THREE.Group } {
  const SEGMENTS = 1024;
  const GROOVE_DEPTH = 0.045 * R;
  const GROOVE_WIDTH = 0.075 * R;
  const SEAM_WIDTH = 0.018 * R;

  // Hirano / Alexander 曲线参数（与参考完全一致）
  const a = (3 * R) / 4;
  const b = R / 4;

  function tennisSeamPoint(t: number): THREE.Vector3 {
    const x = a * Math.cos(t) + b * Math.cos(3 * t);
    const y = a * Math.sin(t) - b * Math.sin(3 * t);
    const z = 2 * Math.sqrt(a * b) * Math.sin(2 * t);
    return new THREE.Vector3(x, y, z);
  }

  // 1. 采样单条接缝（闭曲线，SEGMENTS 个点）
  const seamPoints: THREE.Vector3[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const t = (2 * Math.PI * i) / SEGMENTS;
    seamPoints.push(tennisSeamPoint(t));
  }

  // 2. 球体几何 + 沿接缝做高斯凹槽变形（与参考完全一致）
  const sphereGeo = new THREE.SphereGeometry(R, 192, 128);
  const position = sphereGeo.attributes.position;
  const vertex = new THREE.Vector3();
  const seamPointTmp = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const normal = vertex.clone().normalize();

    // 找单条 seam 中最近的点
    let minDistanceSq = Infinity;
    for (let j = 0; j < seamPoints.length; j++) {
      seamPointTmp.copy(seamPoints[j]);
      const dx = vertex.x - seamPointTmp.x;
      const dy = vertex.y - seamPointTmp.y;
      const dz = vertex.z - seamPointTmp.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < minDistanceSq) minDistanceSq = d2;
    }
    const distance = Math.sqrt(minDistanceSq);

    // Gaussian 影响：seam 中心最深，越远越浅
    const u = distance / GROOVE_WIDTH;
    const influence = Math.exp(-2.5 * u * u);
    const depth = GROOVE_DEPTH * influence;
    const newRadius = vertex.length() - depth;
    vertex.copy(normal.multiplyScalar(newRadius));
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  position.needsUpdate = true;
  sphereGeo.computeVertexNormals();

  // 3. 球面材质（用户 2026-09-07：颜色调暗 0xc8e600 → 0x7d8c0a）
  const ballMaterial = new THREE.MeshStandardMaterial({
    color: 0x7d8c0a,
    roughness: 0.88,
    metalness: 0.0,
  });
  const sphere = new THREE.Mesh(sphereGeo, ballMaterial);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  scene.add(sphere);

  // 4. 单条白色 ribbon（沿接缝凹槽底，与参考实现完全一致）
  const seamRadius = R - GROOVE_DEPTH * 0.75;
  const seamGroup = new THREE.Group();
  const ribbonGeo = buildSeamRibbon(seamPoints, seamRadius, SEAM_WIDTH, SEGMENTS);
  const seamMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const seam = new THREE.Mesh(ribbonGeo, seamMaterial);
  seam.castShadow = false;
  seam.receiveShadow = true;
  seamGroup.add(seam);
  sphere.add(seamGroup);

  return { sphere, seamGroup };
}

/**
 * 沿一条 3D 球面闭曲线构建 ribbon BufferGeometry：
 *   center = pts[i] 朝球心方向归一化 × seamRadius
 *   side = N × T（球面横向）
 *   left/right = center ± side × width/2
 *   normal 指向球心外
 */
function buildSeamRibbon(
  pts: THREE.Vector3[],
  seamRadius: number,
  width: number,
  segments: number
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  for (let i = 0; i < segments; i++) {
    const p = pts[i];
    const next = pts[(i + 1) % segments];

    const normal = p.clone().normalize();
    const tangent = next.clone().sub(p).normalize();
    const side = new THREE.Vector3()
      .crossVectors(normal, tangent)
      .normalize();

    const center = normal.clone().multiplyScalar(seamRadius);
    const left = center
      .clone()
      .add(side.clone().multiplyScalar(width / 2));
    const right = center
      .clone()
      .sub(side.clone().multiplyScalar(width / 2));

    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    normals.push(normal.x, normal.y, normal.z, normal.x, normal.y, normal.z);
  }
  const indices: number[] = [];
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const A = i * 2;
    const B = i * 2 + 1;
    const C = next * 2;
    const D = next * 2 + 1;
    indices.push(A, C, B, B, C, D);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}
