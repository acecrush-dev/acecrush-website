/**
 * 产品房间场景（plan 003 §4-7 + 用户 2026-09-11 转向 → polyhedron）。
 *
 * 用户 2026-09-11 转向：
 *   - "这个几面体相当于还是包在一个球体内"
 *   - 内容分 N 块 → N 面体（polyhedron）
 *   - 主要显示的内容面最大；其他面虚化（透明度 + scale）
 *   - 只支持左右拖拽（yaw），不上下（polar 锁住）
 *   - N 个面相当于把一个圆 N 等分
 *
 * 结构：
 *   - 内壁球壳（SphereGeometry BackSide, felt 纹理），包裹 polyhedron
 *   - 接缝光带（Hirano 曲线采样 → TubeGeometry 自发光，缓慢 opacity 流动）
 *   - Polyhedron（每面 = 1 PlaneGeometry + CanvasTexture）：
 *       围绕相机排列，半径 5.6
 *       朝向相机的面 = 1.0 scale + opacity 1.0 + 清晰
 *       其他面 = scale 0.55 + opacity 0.18 + blur 滤镜（CSS filter）
 *   - 底部 3D 按钮（back / switch / download / docs）
 *   - OrbitControls：polar 锁住水平（只 yaw），yaw 不限（360° 自由）
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  drawButton,
  drawFelt,
  drawPanel,
  disposeTexture,
} from "./panelTexture";

export type RoomId = "craft" | "swing";

export type RoomButton = {
  label: string;
  action: "back" | "switch" | "download" | "docs";
  position: THREE.Vector3;
};

export type RoomPanel = {
  title: string;
  eyebrow?: string;
  body?: string;
  qaList?: { q: string; a: string }[];
  /** 面板 y 偏移（房间内壁球心为原点） */
  y?: number;
};

export type RoomConfig = {
  id: RoomId;
  panels: RoomPanel[];
  buttons: Omit<RoomButton, "label">[];
  buttonLabels: { back: string; switch: string; download: string; docs: string };
  accent: string;
};

export type RoomSceneOpts = {
  mount: HTMLElement;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  config: RoomConfig;
  onAction: (action: RoomButton["action"]) => void;
  /** 用户 v20：双击面板触发，传入 panelIndex */
  onPanelActivate?: (idx: number) => void;
  reduced: boolean;
};

// 用户 2026-09-13 v25：缩小面板 + 整体下移
//   - PANEL_W 3.4 → 2.8, PANEL_H 2.2 → 1.8（更小）
//   - intro 面板 y 从 0.4/0.3 降到 0.1（避免顶部被切）
const ROOM_R = 6.5;        // 球壳半径（内壁）
const PANEL_RING_R = 3.0;  // polyhedron 各面板到中心距离（略内推）
const PANEL_W = 2.8;       // 面板宽度
const PANEL_H = 1.8;       // 面板高度

export class RoomScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private mount: HTMLElement;
  private controls: OrbitControls;
  private config: RoomConfig;
  private onAction: (a: RoomButton["action"]) => void;
  private onPanelActivate?: (idx: number) => void;
  private reduce: boolean;
  private width: number;
  private height: number;
  private textures: THREE.CanvasTexture[] = [];
  private buttonMeshes: THREE.Mesh[] = [];
  private panelMeshes: THREE.Mesh[] = [];
  private activePanelIndex = -1;
  /** 用户 v32：detail popup 打开时强制 active 的面板索引（覆盖几何检测） */
  private detailActiveIndex: number | null = null;
  private hovered = -1;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private cameraDir = new THREE.Vector3();
  private tubeMesh: THREE.Mesh | null = null;

  constructor(opts: RoomSceneOpts) {
    this.mount = opts.mount;
    this.camera = opts.camera;
    this.renderer = opts.renderer;
    this.config = opts.config;
    this.onAction = opts.onAction;
    this.onPanelActivate = opts.onPanelActivate;
    this.reduce = opts.reduced;
    this.width = opts.mount.clientWidth || window.innerWidth;
    this.height = opts.mount.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0E1410);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.build();
  }

  private build() {
    // 1) 内壁球壳（felt 噪点纹理）
    const innerGeo = new THREE.SphereGeometry(ROOM_R, 64, 48);
    const feltTex = drawFelt();
    this.textures.push(feltTex);
    const innerMat = new THREE.MeshStandardMaterial({
      map: feltTex,
      side: THREE.BackSide,
      roughness: 0.95,
      metalness: 0.0,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    this.scene.add(inner);

    // 2) 接缝光带（Hirano 曲线 → TubeGeometry）
    const SEGMENTS = 256;
    const a = (3 * (ROOM_R * 0.85)) / 4;
    const b = (ROOM_R * 0.85) / 4;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const t = (2 * Math.PI * i) / SEGMENTS;
      pts.push(
        new THREE.Vector3(
          a * Math.cos(t) + b * Math.cos(3 * t),
          a * Math.sin(t) - b * Math.sin(3 * t),
          2 * Math.sqrt(a * b) * Math.sin(2 * t)
        )
      );
    }
    for (const p of pts) p.multiplyScalar(0.97);
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const tubeGeo = new THREE.TubeGeometry(curve, SEGMENTS, 0.035, 8, true);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
    });
    this.tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    this.scene.add(this.tubeMesh);

    // 3) 微弱环境光
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);
    const point = new THREE.PointLight(0xffffff, 0.6, 50);
    point.position.set(0, 0, 0);
    this.scene.add(point);

    // 4) Polyhedron：N 面围绕相机环形排列（圆 N 等分）
    const N = this.config.panels.length;
    const planeGeo = new THREE.PlaneGeometry(PANEL_W, PANEL_H);
    for (let i = 0; i < N; i++) {
      const panel = this.config.panels[i];
      const tex = drawPanel({
        title: panel.title,
        eyebrow: panel.eyebrow,
        body: panel.body,
        qaList: panel.qaList,
        isDark: true,
      });
      this.textures.push(tex);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 1.0,
      });
      const mesh = new THREE.Mesh(planeGeo, mat);
      const angle = (2 * Math.PI * i) / N;
      const x = Math.sin(angle) * PANEL_RING_R;
      const z = -Math.cos(angle) * PANEL_RING_R; // z 朝向相机为负
      mesh.position.set(x, panel.y ?? 0, z);
      // 让面板朝向中心（lookAt 球心）
      mesh.lookAt(0, panel.y ?? 0, 0);
      mesh.userData.angle = angle;
      mesh.userData.index = i;
      this.panelMeshes.push(mesh);
      this.scene.add(mesh);
    }

    // 5) 底部 3D 按钮（环形面板下方）
    const buttonGeo = new THREE.PlaneGeometry(1.1, 0.28);
    for (const btn of this.config.buttons) {
      const label =
        btn.action === "back"
          ? this.config.buttonLabels.back
          : btn.action === "switch"
            ? this.config.buttonLabels.switch
            : btn.action === "download"
              ? this.config.buttonLabels.download
              : this.config.buttonLabels.docs;
      const tex = drawButton({
        label,
        hovered: false,
        isDark: true,
        accent: this.config.accent,
      });
      this.textures.push(tex);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 1.0,
      });
      const mesh = new THREE.Mesh(buttonGeo, mat);
      mesh.position.copy(btn.position);
      mesh.userData.action = btn.action;
      mesh.userData.index = this.buttonMeshes.length;
      this.buttonMeshes.push(mesh);
      this.scene.add(mesh);
    }

    // 6) OrbitControls：只 yaw（polar 锁住水平）
    // 用户 2026-09-11 v12：拖拽方向反转（rotateSpeed = -0.8，负值反向）
    this.camera.position.set(0, 0, 0.01);
    this.controls.target.set(0, 0, -1);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = -0.8;  // 反向 + 略慢
    // 锁住 polar = π/2（水平视线）→ 不支持上下拖拽
    this.controls.minPolarAngle = Math.PI / 2;
    this.controls.maxPolarAngle = Math.PI / 2;
    // yaw 完全自由（360°）
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.update();
  }

  update(_dt: number) {
    this.controls.update();

    // 接缝光带缓慢流动（标志性瞬间）
    if (this.tubeMesh && !this.reduce) {
      const t = performance.now() / 1000;
      const mat = this.tubeMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.25 + Math.sin(t * 0.6) * 0.1;
    }

    // 用户 v32：detail popup 打开时强制 active 面板（跳过几何检测）
    if (this.detailActiveIndex !== null) {
      // 已由 setDetailActive 主动设置过 active 面板
      // 此处只需保持其他面板的非 active 状态（已重建过），无需重新检测
      // 仍然更新 scale/opacity（用 detail 面板的 facing）
      this.camera.getWorldDirection(this.cameraDir);
      for (let i = 0; i < this.panelMeshes.length; i++) {
        const mesh = this.panelMeshes[i];
        const normal = mesh.position.clone().normalize().negate();
        const facing = -normal.dot(this.cameraDir);
        const visibility = Math.max(0, Math.min(1, (facing + 0.6) / 1.2));
        const scale = 0.78 + 0.22 * visibility;
        const opacity = 0.45 + 0.55 * visibility;
        mesh.scale.set(scale, scale, 1);
        (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      }
      return;
    }

    // 更新 panel 显隐 / scale（基于与相机的朝向）
    this.camera.getWorldDirection(this.cameraDir);
    let bestIndex = -1;
    let bestFacing = -2;
    for (let i = 0; i < this.panelMeshes.length; i++) {
      const mesh = this.panelMeshes[i];
      // 面板法线方向（指向中心 = -position.normalize = "from origin to panel" 的反向）
      const normal = mesh.position.clone().normalize().negate();
      // 用户 v17 修复：facing 应该用 "从面板指向相机" 的方向，与 normal 点乘
      // 之前用 cameraDir（相机视线方向 = 从相机向外），结果恒为 -1（面板永远"背朝相机"）
      // → 修复：-normal.dot(cameraDir) = normal.dot(directionFromPanelToCamera)
      const facing = -normal.dot(this.cameraDir);
      // 用户 2026-09-11 v10：减少虚化，提升非正面面可读性
      //   facing = 1（正对相机）→ visibility = 1
      //   facing = 0（垂直侧面）→ visibility = 0.55
      //   facing = -1（背面）→ visibility = 0.1
      const visibility = Math.max(0, Math.min(1, (facing + 0.6) / 1.2));
      // 活跃面：scale 1.0 + opacity 1.0；侧面：scale 0.78 + opacity 0.45
      const scale = 0.78 + 0.22 * visibility;
      const opacity = 0.45 + 0.55 * visibility;
      mesh.scale.set(scale, scale, 1);
      (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      // 记录最朝相机的面板（用于高亮边框）
      if (facing > bestFacing) {
        bestFacing = facing;
        bestIndex = i;
      }
    }

    // 用户 v28：active 状态改为底色变化（不用边框）
    //   - 检测 active panel 切换 → 重建该面板的 CanvasTexture（带 active=true, accent）
    //   - 同时重建旧的 active panel（恢复 inactive 底色）
    //   - 每帧只在 activePanelIndex 变化时重建（性能）
    if (bestIndex !== this.activePanelIndex && bestFacing > 0.0) {
      const prev = this.activePanelIndex;
      this.activePanelIndex = bestIndex;
      if (prev >= 0 && prev < this.panelMeshes.length) {
        this.rebuildPanelTexture(prev, false);
      }
      if (bestIndex >= 0 && bestIndex < this.panelMeshes.length) {
        this.rebuildPanelTexture(bestIndex, true);
      }
    }
  }

  /** 用户 v28：重建面板 CanvasTexture（active 状态切换底色） */
  private rebuildPanelTexture(idx: number, active: boolean) {
    const mesh = this.panelMeshes[idx];
    if (!mesh) return;
    const panel = this.config.panels[idx];
    const isDark =
      typeof document === "undefined"
        ? true
        : document.documentElement.classList.contains("dark");
    const newTex = drawPanel({
      title: panel.title,
      eyebrow: panel.eyebrow,
      body: panel.body,
      qaList: panel.qaList,
      isDark,
      active,
      accent: this.config.accent,
    });
    // 释放旧纹理
    const oldTex = (mesh.material as THREE.MeshBasicMaterial).map;
    this.textures.push(newTex);
    (mesh.material as THREE.MeshBasicMaterial).map = newTex;
    (mesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
    disposeTexture(oldTex);
  }

  private rebuildButtonTexture(idx: number, hovered: boolean) {
    const mesh = this.buttonMeshes[idx];
    if (!mesh) return;
    const action = mesh.userData.action as RoomButton["action"];
    const label =
      action === "back"
        ? this.config.buttonLabels.back
        : action === "switch"
          ? this.config.buttonLabels.switch
          : action === "download"
            ? this.config.buttonLabels.download
            : this.config.buttonLabels.docs;
    const old = (mesh.material as THREE.MeshBasicMaterial).map;
    const tex = drawButton({ label, hovered, isDark: true, accent: this.config.accent });
    this.textures.push(tex);
    (mesh.material as THREE.MeshBasicMaterial).map = tex;
    (mesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
    disposeTexture(old);
  }

  handlePointerMove(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.buttonMeshes, false);
    const best = hits[0]?.object.userData.index ?? -1;
    if (best !== this.hovered) {
      if (this.hovered >= 0) this.rebuildButtonTexture(this.hovered, false);
      if (best >= 0) this.rebuildButtonTexture(best, true);
      this.hovered = best;
      this.renderer.domElement.style.cursor = best >= 0 ? "pointer" : "grab";
    }
  }

  handleClick(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.buttonMeshes, false);
    const action = hits[0]?.object.userData.action as RoomButton["action"] | undefined;
    if (action) this.onAction(action);
  }

  /**
   * 用户 v20：双击面板打开详细 popup
   * raycast 击中 panel mesh → 调 onPanelActivate(index)
   */
  handleDoubleClick(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.panelMeshes, false);
    const idx = hits[0]?.object.userData.index;
    if (typeof idx === "number") {
      this.onPanelActivate?.(idx);
    }
  }

  resize() {
    this.width = this.mount.clientWidth || window.innerWidth;
    this.height = this.mount.clientHeight || window.innerHeight;
  }

  getScene() {
    return this.scene;
  }

  applyLocale(buttonLabels: { back: string; switch: string; download: string; docs: string }) {
    this.config.buttonLabels = buttonLabels;
    for (let i = 0; i < this.buttonMeshes.length; i++) {
      this.rebuildButtonTexture(i, this.hovered === i);
    }
  }

  applyTheme() {
    // 主题切换：重建所有面板纹理（dark / light 不同底色）
    for (let i = 0; i < this.panelMeshes.length; i++) {
      const wasActive = i === this.activePanelIndex;
      this.rebuildPanelTexture(i, wasActive);
    }
    this.applyLocale(this.config.buttonLabels);
  }

  /** 用户 v32：detail popup 打开时强制 active 面板（覆盖几何检测） */
  setDetailActive(idx: number | null) {
    if (this.detailActiveIndex === idx) return;
    const prev = this.detailActiveIndex;
    this.detailActiveIndex = idx;
    if (prev != null && prev >= 0 && prev < this.panelMeshes.length) {
      this.rebuildPanelTexture(prev, false);
    }
    if (idx != null && idx >= 0 && idx < this.panelMeshes.length) {
      this.rebuildPanelTexture(idx, true);
      // 重置几何检测的 active index 以避免视觉跳变
      this.activePanelIndex = idx;
    }
  }

  dispose() {
    this.controls.dispose();
    for (const tex of this.textures) disposeTexture(tex);
    this.textures = [];
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat.dispose();
      }
    });
  }
}