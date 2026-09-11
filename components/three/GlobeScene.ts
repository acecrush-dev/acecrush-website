/**
 * Hub 场景（plan 003 §4-6 / §3-4）。
 *
 * 实现统一接口：
 *   build()       - 创建球 / 标记 / 地面 / 星尘 / OrbitControls
 *   update(dt)    - 每帧推进自转 / 漂移 / raycast hover
 *   applyLocale() - hub 模式下 tooltip 文案随 locale 重建（构建期使用 i18n key）
 *   applyTheme()  - 重建 overlay 配色（背景色由 .dark class 控制，无需在此实现）
 *   dispose()     - 释放几何 / 材质 / overlay / controls
 *   onPointerX    - 鼠标 hover / click 回调，由 SceneManager 调用
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  buildBallWithSeams,
  latLonToMarkerPos,
  type MarkerSpec,
  type MarkerAnchor,
} from "./tennisBall";
import { createTooltipOverlay } from "./overlay";
import { createBrandText, type BrandTextHandle } from "./brandText";

export type HubMarker = MarkerSpec & {
  /** 进入房间时的目标 view（globe 模式：craft / swing） */
  target: "craft" | "swing";
};

export const HUB_MARKERS: HubMarker[] = [
  // 用户 2026-09-07：两产品 marker 不同色，避开 smoke 禁用的科技绿 hex。
  // 用户 2026-09-11 转向：放弃 contact 节点（contact 留在 nav 顶端），hub 上只有 2 个产品 marker。
  { lon: -55, lat: 18, color: "#2563EB", label: "AceCrush Craft", sub: "Android · grip + stringing", targetId: "#craft", target: "craft" },
  { lon: 65, lat: 22, color: "#DC2626", label: "Swing Analysis", sub: "Desktop · auto segmentation", targetId: "#swing", target: "swing" },
];

const BALL_R = 1.5;
// 用户 2026-09-11：球缩小（约画面 32% 宽），球体上方留出 nav + 内容呼吸空间；
// hero 仍然保持 0.34 不变。
const BALL_SCREEN_W_HUB = 0.32;

export type GlobeSceneOpts = {
  mount: HTMLElement;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  onMarkerActivate?: (marker: HubMarker) => void;
  labels: { craft: string; swing: string };
};

export class GlobeScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private mount: HTMLElement;
  private controls: OrbitControls;
  private sphere!: THREE.Mesh;
  private markerGroup = new THREE.Group();
  private dust!: THREE.Points;
  private overlay: ReturnType<typeof createTooltipOverlay>;
  private anchors: MarkerAnchor[];
  private width: number;
  private height: number;
  private autoRotate = true;
  private rotY = 0;
  private reduce: boolean;
  private hovered = -1;
  private labels: GlobeSceneOpts["labels"];
  private onMarkerActivate?: (m: HubMarker) => void;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private brandText: BrandTextHandle | null = null;

  constructor(opts: GlobeSceneOpts) {
    this.mount = opts.mount;
    this.camera = opts.camera;
    this.renderer = opts.renderer;
    this.labels = opts.labels;
    this.onMarkerActivate = opts.onMarkerActivate;
    this.width = opts.mount.clientWidth || window.innerWidth;
    this.height = opts.mount.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    this.reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.autoRotate = !this.reduce;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.anchors = HUB_MARKERS.map((spec) => ({ x: 0, y: 0, facing: false, spec }));

    this.build();
    this.overlay = createTooltipOverlay({
      mount: this.mount,
      specs: HUB_MARKERS,
      renderLabel: (spec) => this.renderLabel(spec),
    });
  }

  private build() {
    // 地面
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 15),
      new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.875;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 三光源（参数照抄 hero）
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1.4);
    this.scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(3, 4, 5);
    keyLight.castShadow = true;
    this.scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
    fillLight.position.set(-4, 1, -3);
    this.scene.add(fillLight);

    // 网球
    const { sphere } = buildBallWithSeams(BALL_R, this.scene);
    this.sphere = sphere;

    // marker
    for (const spec of HUB_MARKERS) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 24, 24),
        new THREE.MeshBasicMaterial({ color: spec.color })
      );
      const r = BALL_R + 0.01;
      m.position.copy(latLonToMarkerPos(spec.lat, spec.lon, r));
      m.userData.spec = spec;
      this.markerGroup.add(m);
    }
    this.scene.add(this.markerGroup);

    // 星尘
    const dustCount = Math.min(400, window.innerWidth < 768 ? 200 : 400);
    const dustGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const r = 8 + Math.random() * 6;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.03,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.dust = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.dust);

    // 用户 2026-09-11 v8：brand 回到 nav 顶端左上角（静态 HTML），不再浮在 3D 场景里。
    //   - "和球体部分完全分隔开" → 不要让 brand 受场景动画影响
    //   - "logo 是不能动的" → 静态 logo
    this.brandText = null;

    // OrbitControls
    // 用户 2026-09-11：只支持左右拖拽（锁住 polar），上下拖动禁用。
    // v12：拖拽方向反转（rotateSpeed = -0.8）。
    // 桌面 target 在球心；移动端略上抬避开 nav（与之前一致）。
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    this.controls.target.set(0, isMobile ? 0.4 : 0, 0);
    this.controls.update();
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = false;
    this.controls.rotateSpeed = -0.8;  // 反向 + 略慢
    // 锁住 pitch：把 minPolarAngle = maxPolarAngle = 当前 polar（水平视线）
    // OrbitControls 默认 polar 是从 +Y 轴算起 → 水平视线 = π/2
    this.controls.minPolarAngle = Math.PI / 2;
    this.controls.maxPolarAngle = Math.PI / 2;
    // 限制 yaw 到 ±60°（不绕到背面）
    this.controls.minAzimuthAngle = -Math.PI / 3;
    this.controls.maxAzimuthAngle = Math.PI / 3;
    this.controls.minDistance = 2.7;
    this.controls.maxDistance = 9;
    this.controls.addEventListener("start", () => {
      this.autoRotate = false;
    });
    this.controls.addEventListener("end", () => {
      this.autoRotate = true;
    });
  }

  /** 全屏 hub 取景：球占画面 55% */
  fitCamera() {
    this.width = this.mount.clientWidth || window.innerWidth;
    this.height = this.mount.clientHeight || window.innerHeight;
    const aspect = this.width / this.height;
    const camZ = Math.max(
      5.6,
      (3 / BALL_SCREEN_W_HUB) /
        (2 * Math.tan((45 / 2) * (Math.PI / 180)) * aspect)
    );
    this.camera.aspect = aspect;
    this.camera.position.set(0, 0.225, camZ);
    this.camera.updateProjectionMatrix();
  }

  private renderLabel(rawSpec: MarkerSpec): HTMLElement {
    // HubMarker extends MarkerSpec with `target`；overlay 模块只看到 MarkerSpec 签名。
    const spec = rawSpec as HubMarker;
    const btn = document.createElementNS(
      "http://www.w3.org/1999/xhtml",
      "button"
    ) as HTMLButtonElement;
    btn.type = "button";
    btn.dataset.target = spec.targetId.replace("#", "");
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
    btn.style.cssText = [
      "padding:8px 12px",
      "border-radius:10px",
      `background:${bg}`,
      `border:1px solid ${borderColor}`,
      `box-shadow:${shadow}`,
      "font-size:13px",
      "line-height:1.35",
      `color:${fg}`,
      "display:inline-flex",
      "align-items:center",
      "white-space:nowrap",
      "pointer-events:auto",
      "cursor:pointer",
      "text-decoration:none",
      "font:inherit",
    ].join(";");
    const dot = document.createElement("span");
    dot.style.cssText = [
      "display:inline-block",
      "width:8px",
      "height:8px",
      "border-radius:50%",
      "margin-right:6px",
      `background:${spec.color}`,
    ].join(";");
    const label = document.createElement("span");
    label.style.cssText = "font-weight:600";
    // hub 模式：tooltip label 用 i18n 文案（仅产品 marker；contact 用原 spec.label）
    label.textContent =
      spec.target === "craft"
        ? this.labels.craft
        : this.labels.swing;
    btn.appendChild(dot);
    btn.appendChild(label);
    btn.addEventListener("click", () => {
      this.onMarkerActivate?.(spec);
    });
    return btn;
  }

  private projectMarkers() {
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const proj = new THREE.Vector3();
    for (let i = 0; i < this.anchors.length; i++) {
      const m = this.markerGroup.children[i] as THREE.Mesh;
      const world = new THREE.Vector3();
      m.getWorldPosition(world);
      proj.copy(world).project(this.camera);
      const facing = world.dot(camDir) < 0;
      this.anchors[i].x = ((proj.x + 1) / 2) * this.width;
      this.anchors[i].y = ((1 - proj.y) / 2) * this.height;
      this.anchors[i].facing = facing;
    }
  }

  private ballPxRadius() {
    const camDist = this.camera.position.length();
    const visH =
      2 * camDist * Math.tan((45 / 2) * (Math.PI / 180));
    return (BALL_R / visH) * this.height;
  }

  update(dt: number) {
    if (this.autoRotate && !this.reduce) this.rotY += 0.0025;
    this.sphere.rotation.y = this.rotY;
    this.markerGroup.rotation.copy(this.sphere.rotation);
    // 星尘缓慢漂移
    this.dust.rotation.y += dt * 0.02;
    this.controls.update();
    this.projectMarkers();
    this.overlay.update(this.width, this.height, this.anchors, this.ballPxRadius());
  }

  /** hub hover 高亮（鼠标 hover marker 时 cursor 反馈） */
  handlePointerMove(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let best = -1;
    let bestD = 24;
    for (let i = 0; i < this.anchors.length; i++) {
      const a = this.anchors[i];
      if (!a.facing) continue;
      const dx = a.x - mx;
      const dy = a.y - my;
      const d = Math.hypot(dx, dy);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best !== this.hovered) {
      this.hovered = best;
      this.renderer.domElement.style.cursor = best >= 0 ? "pointer" : "grab";
    }
  }

  /** ResizeObserver callback：同步投影尺寸 */
  resize() {
    this.fitCamera();
  }

  getScene() {
    return this.scene;
  }

  applyLocale(labels: { craft: string; swing: string }) {
    this.labels = labels;
    // 重建 overlay 标签
    this.overlay.dispose();
    this.overlay = createTooltipOverlay({
      mount: this.mount,
      specs: HUB_MARKERS,
      renderLabel: (spec) => this.renderLabel(spec),
    });
  }

  applyTheme() {
    // tooltip 配色由 renderLabel 在每次重建时读取 .dark class，
    // 因此 locale / theme 切换只需 dispose + 重建 overlay。
    this.applyLocale(this.labels);
  }

  dispose() {
    this.controls.dispose();
    this.overlay.dispose();
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat.dispose();
      } else if ((obj as THREE.Points).isPoints) {
        const p = obj as THREE.Points;
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
      }
    });
  }
}