"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  buildBallWithSeams,
  latLonToMarkerPos,
  type MarkerSpec,
  type MarkerAnchor,
} from "../three/tennisBall";
import { createTooltipOverlay } from "../three/overlay";

/**
 * TennisBallGlobe - Three.js 交互式网球地球（plan 002 / plan 003）。
 *
 * 几何 / 接缝 / ribbon / marker 坐标换算共享于 components/three/tennisBall.ts，
 * SVG 折线 tooltip 覆盖层共享于 components/three/overlay.ts（plan 003 §4-1, 2, 10）。
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

    // plan 002：相机取景按参考等比 x1.5 映射。
    // 用户 2026-09-07 手机版二次修复：相机距离按「球占画面宽度比例」反推。
    //   球直径 3 世界单位；可视高度 visH = 2*camZ*tan(fov/2)，可视宽 = visH*aspect。
    //   目标：窄屏球占画面宽 ~34% → camZ ~ 10.5/aspect；宽屏维持 5.6。
    //   用 max 保证 aspect >= 1.875 时连续回落到 5.6，桌面端不受影响。
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
    //   setSize(w, h, false) 只设置绘制缓冲（w x dpr），不写 CSS 尺寸，
    //   canvas 无 CSS 尺寸时按 attribute 显示 → dpr=2 手机上 canvas 以
    //   2 倍 CSS 尺寸溢出容器，球被裁掉一半、tooltip 锚点与 3D marker 错位 2x。
    //   默认（true）会让 three 写入 style.width/height = CSS 像素，正确铺满 mount。
    renderer.setSize(width, resolvedHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // v5.2：参考实现的阴影配置
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", ariaLabel);

    // 球体几何 - 真实网球接缝（plan 002 / plan 003 共享组件）
    const BALL_R = 1.5;
    const { sphere } = buildBallWithSeams(BALL_R, scene);

    // plan 002：调暗到 1.0/1.8/0.4；之后追调"光线稍微增强"：
    // hemi 1.0 -> 1.4 / keyLight 1.8 -> 2.4 / fillLight 0.4 -> 0.7。
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1.4);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(3, 4, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
    fillLight.position.set(-4, 1, -3);
    scene.add(fillLight);

    // plan 002：地面平面（参考 10 x 10 等比 x1.5 = 15 x 15，y=-1.25 x1.5）
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
    //   - 松开鼠标后立即恢复自转（不等 3s）
    //   - 滚轮 zoom in/out 不需要，禁用（避免劫持页面滚动 + 移动端 pinch）
    // 用户 2026-09-11：移动端把 OrbitControls 的 target.y 上抬 0.4，让球在画面里
    //   偏下一些，避免与 hero 文案重叠（桌面端保持 target=(0,0,0)）。
    const isMobile = window.innerWidth < 768;
    const ballOffsetY = isMobile ? 0.4 : 0;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, ballOffsetY, 0);
    controls.update();
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
      const r = BALL_R + 0.01; // 略大于球面半径，避免 z-fighting
      m.position.copy(latLonToMarkerPos(spec.lat, spec.lon, r));
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

    // SVG 折线 tooltip 覆盖层（共享组件 plan 003 §4-2）。
    // hero 模式：标签是 <a href> 锚点，点击跳转到下方产品区。
    function renderLabel(spec: MarkerSpec): HTMLAnchorElement {
      const wrapper = document.createElementNS(
        "http://www.w3.org/1999/xhtml",
        "a"
      ) as HTMLAnchorElement;
      wrapper.setAttribute("href", spec.targetId);
      // plan 002 用户 2026-09-07：tooltip 配色强对比
      //   - 在 dark 主题（html.dark）下：白底黑字
      //   - 在 light 主题下：黑底白字
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
      return wrapper;
    }

    const overlay = createTooltipOverlay({
      mount,
      specs: MARKERS,
      renderLabel,
    });

    function projectMarkers() {
      // 把 3D marker 坐标投影到屏幕像素坐标（相对 overlay 容器）
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      const proj = new THREE.Vector3();
      for (let i = 0; i < tooltipAnchors.length; i++) {
        const m = markerGroup.children[i] as THREE.Mesh;
        // 世界坐标：考虑 sphere 与 markerGroup 旋转
        const world = new THREE.Vector3();
        m.getWorldPosition(world);
        proj.copy(world).project(camera);
        // z > 1 = 在相机远平面之外（背面）
        const facing = world.dot(camDir) < 0; // camDir 指向相机身后，朝向相机的点在 camDir 反方向
        tooltipAnchors[i].x = ((proj.x + 1) / 2) * width;
        tooltipAnchors[i].y = ((1 - proj.y) / 2) * resolvedHeight;
        tooltipAnchors[i].facing = facing;
      }
    }

    function ballPxRadius() {
      // 球面像素半径按相机实际距离反推（plan 002 修复：用 min(w,h)*0.42 估算
      // 在相机拉远后会远大于真实球）。visH = 2*dist*tan(fov/2)。
      const camDist = camera.position.length();
      const visH = 2 * camDist * Math.tan((45 / 2) * (Math.PI / 180));
      return (BALL_R / visH) * resolvedHeight;
    }

    function loop() {
      raf = requestAnimationFrame(loop);
      // 用户 2026-09-07：自转状态完全由 OrbitControls.start/end 切换。
      if (autoRotate) rotY += 0.0025;
      // plan 002：球体只绕 Y 自转（X 由 OrbitControls 的 polar angle 控制）
      sphere.rotation.y = rotY;
      // 接缝 ribbon 是 sphere 的子节点（跟随旋转）
      markerGroup.rotation.copy(sphere.rotation);
      // plan 002：OrbitControls 阻尼必需在每次渲染前调用 update()
      controls.update();
      renderer.render(scene, camera);
      projectMarkers();
      overlay.update(width, resolvedHeight, tooltipAnchors, ballPxRadius());
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
      renderer.domElement.removeEventListener(
        "pointermove",
        onPointerMoveHover
      );
      controls.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
      overlay.dispose();
      for (const c of markerGroup.children) {
        const m = c as THREE.Mesh;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      renderer.dispose();
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
        // 容器透明，WebGL canvas 自己渲染球；WebGL 不可用时
        // 由 useEffect 写入 data-fallback="1"，下方 css fallback 兜底显示。
        background: "transparent",
        overflow: "visible",
      }}
      data-fallback="0"
    />
  );
}