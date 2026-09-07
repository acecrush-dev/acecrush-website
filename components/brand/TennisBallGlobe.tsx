"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * TennisBallGlobe - Three.js 交互式网球 🎾 地球（用户 2026-09-07 追加）。
 *
 * 设计：白底 + 弯曲接缝 + 绒毛噪点的程序化网球纹理贴在球面上，
 * 两个产品 marker（Craft + Swing Analysis）固定在球面坐标上。
 * 用户可鼠标拖动旋转（OrbitControls），光标悬停 marker 时弹 tooltip；
 * tooltip 本身是 <a href="#craft|#swing"> 锚点，点击跳转到下方产品区。
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
  /** 用户 2026-09-07：点击 tooltip 跳转的页内锚点（如 "#craft"） */
  targetId: string;
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
    targetId: "#craft",
  },
  {
    lon: 65,
    lat: 22,
    color: "#DC2626", // red
    label: "Swing Analysis",
    sub: "Desktop · auto segmentation",
    targetId: "#swing",
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

    // 用户 2026-09-07 手机版修复：width/resolvedHeight 用 let，
    // ResizeObserver 时同步更新（overlay 投影坐标依赖这两个值）。
    let width = mount.clientWidth;
    // height: 数字 = 固定 px；"100%" = 跟随父容器 clientHeight
    let resolvedHeight =
      typeof height === "number"
        ? height
        : Math.max(240, mount.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const scene = new THREE.Scene();
    // plan 002：场景背景改为深灰（参考 0x111111）
    scene.background = new THREE.Color(0x111111);

    // plan 002：相机取景按参考等比 ×1.5 映射。
    // 用户 2026-09-07 手机版二次修复：相机距离按「球占画面宽度比例」反推。
    //   球直径 3 世界单位；可视高度 visH = 2·camZ·tan(fov/2)，可视宽 = visH·aspect。
    //   目标：窄屏球占画面宽 ~34% → camZ ≈ 10.5/aspect；宽屏维持 5.6。
    //   用 max 保证 aspect ≥ 1.875 时连续回落到 5.6，桌面端不受影响。
    const BALL_SCREEN_W = 0.34;
    const computeCamZ = (asp: number) =>
      Math.max(5.6, (3 / BALL_SCREEN_W) / (2 * Math.tan((45 / 2) * (Math.PI / 180)) * asp));
    const aspect = width / resolvedHeight;
    const camZ = computeCamZ(aspect);
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
    // ★ 根因修复（用户 2026-09-07 手机截图）：第三参数绝不能传 false。
    //   setSize(w, h, false) 只设置绘制缓冲（w×dpr），不写 CSS 尺寸，
    //   canvas 无 CSS 尺寸时按 attribute 显示 → dpr=2 手机上 canvas 以
    //   2 倍 CSS 尺寸溢出容器，球被裁掉一半、tooltip 锚点与 3D marker 错位 2×。
    //   默认（true）会让 three 写入 style.width/height = CSS 像素，正确铺满 mount。
    renderer.setSize(width, resolvedHeight);
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

      // 标签（foreignObject 容许 HTML，方便走 design tokens）。
      // 用户 2026-09-07：Swing Analysis 右侧被截掉。foW 要够宽容下
      // "Swing Analysis" + 副标题 "Desktop · auto segmentation"。
      // 初始 width/height 只是占位，updateOverlays 每帧根据 foW/foH 重设。
      const fo = document.createElementNS(overlayNS, "foreignObject");
      fo.setAttribute("width", "240");
      fo.setAttribute("height", "60");
      // 用户 2026-09-07：tooltip 可以点击跳转到下方对应产品区（/#craft、/#swing）。
      // 用真正的 <a href="#...">：原生 hash 导航复用全局 scroll-behavior:smooth
      // + scroll-margin-top:84px，且天然可键盘 Tab 聚焦 + Enter 激活。
      const wrapper = document.createElementNS(
        "http://www.w3.org/1999/xhtml",
        "a"
      ) as HTMLAnchorElement;
      wrapper.setAttribute("href", spec.targetId);
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
        // overlay svg 是 pointer-events:none（不挡 OrbitControls 拖拽），
        // 锚点自己重新开启 hit-testing，才能接住点击 / 键盘焦点。
        "pointer-events:auto",
        "cursor:pointer",
        "text-decoration:none",
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

      // 用户 2026-09-07：量出 tooltip 实际渲染宽度（inline-block 收缩宽），
      // 之后每帧的边界 clamp / 引线锚点都用它 —— 保证 box 永不出画布、
      // 引线永远贴着 box 边缘（量不到时回退 230）。
      const boxW = wrapper.getBoundingClientRect().width || 230;

      return { path, endDot, fo, wrapper, boxW };
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
        // 用户 2026-09-07：「tooltip 像同步卫星跟随自转」。
        // 设计：
        //   - tooltip 中心位置 = marker 屏幕坐标 + marker 径向单位向量 × LEADER。
        //   - marker 径向单位向量用 marker 在画布坐标的方向（从画布中心 →
        //     marker）作为屏幕空间的近似径向方向；球自转时 marker 屏幕位置在
        //     变化，tooltip 跟随旋转并保持固定 LEADER 距离。
        //   - label 方向永远沿「marker 离开球心」方向放在 marker 外侧，
        //     不再用画布左右二分（这样在 marker 转到正上 / 正下时 tooltip
        //     也能正确飞到上下边缘，而不是被左右二分逻辑卡住）。
        const foW = node.boxW; // tooltip 实际渲染宽度（build 时量出）
        const foH = 56;
        const RADIAL = 14; // marker 边缘的视觉半径
        // 黄金分割：marker → label 中心距离 = 0.618 × 球面像素半径。
        // 用户 2026-09-07：球面像素半径按相机实际距离反推（不再用
        // min(w,h)×0.42 估算 —— 相机拉远后估算值会远大于真实球）：
        //   visH = 2·dist·tan(fov/2)，ballPxR = BALL_R / visH × canvas 高。
        const camDist = camera.position.length();
        const visH = 2 * camDist * Math.tan((45 / 2) * (Math.PI / 180));
        const ballPxR = (BALL_R / visH) * resolvedHeight;
        const LEADER = ballPxR * 0.618;

        // 直线起点：marker 边缘（沿屏幕径向外推 RADIAL）
        const edgeX = a.x + ux * RADIAL;
        const edgeY = a.y + uy * RADIAL;
        // label 中心：marker 边缘再外推 LEADER
        const labelCenterX = edgeX + ux * LEADER;
        const labelCenterY = edgeY + uy * LEADER;

        let foX = labelCenterX - foW / 2;
        let foY = labelCenterY - foH / 2;
        // 边界 clamp：label 整体不出画布（用户 2026-09-07 手机版：
        // 右侧 marker 的 tooltip 之前被推出右缘截断，这里必须硬 clamp）。
        foX = Math.max(4, Math.min(width - foW - 4, foX));
        foY = Math.max(4, Math.min(resolvedHeight - foH - 4, foY));

        // 引线终点 = clamp 后 box 矩形上离 marker 边缘最近的点。
        // 之前用「未 clamp 的 label 内缘中点」，box 被 clamp 后线会脱离 box；
        // 改成矩形最近点后，无论 box 被推到哪，线都始终贴着 box。
        const nearestX = Math.max(foX, Math.min(edgeX, foX + foW));
        const nearestY = Math.max(foY, Math.min(edgeY, foY + foH));

        // 直线：marker 边缘 → box 最近点
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
    // 用户 2026-09-07：同步 width/resolvedHeight（overlay 投影用）；
    // setSize 同样不传 false（见上方根因修复注释）。
    const ro = new ResizeObserver(() => {
      width = mount.clientWidth;
      resolvedHeight =
        typeof height === "number"
          ? height
          : Math.max(240, mount.clientHeight);
      renderer.setSize(width, resolvedHeight);
      const newAspect = width / resolvedHeight;
      camera.aspect = newAspect;
      camera.position.set(0, 0.225, computeCamZ(newAspect));
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
