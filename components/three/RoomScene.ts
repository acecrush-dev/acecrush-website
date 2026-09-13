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
  drawTextLabel,
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
  /** 用户 v39：可选缩略图 URL，面板上画图 + 短标题，详细内容走 popup */
  image?: string;
  /** 用户 v39：缩略图 alt / tooltip 文本（画到 canvas 右下角小字） */
  imageLabel?: string;
  /** 用户 v50：thumbnail 透明度（0-1），用于虚化；位置统一（紧挨着最后一排文字下一行 + 居中） */
  thumbnailOpacity?: number;
};

export type RoomConfig = {
  id: RoomId;
  panels: RoomPanel[];
  buttons: Omit<RoomButton, "label">[];
  buttonLabels: { back: string; switch: string; download: string; docs: string };
  accent: string;
  /** 用户 v47：产品名（用于在多面体上方展示 3D 文字），i18n */
  productName: string;
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
// 用户 v53：放弃 v52 的"按比例缩放 panel"做法（用户反馈"不是要拉远距离 面和面距离不要太开"）
//   → panel 保持原生尺寸，camera 不动，polyhedron 形状通过 ring shape 适配 viewport
//   → 桌面：横向圆形 ring（panels 围成圆周，X 轴展得开）
//   → 手机/pad portrait：纵向 ring（X 半径 < Z 半径 → 视觉上 ring 变"瘦高"，
//     panels 离 camera 距离接近，宽度占比自然缩减）
//   → 不动 camera 距离（不"拉远"），不缩 panel 大小（不"开"），screen 占比靠 ring shape 适配
const ROOM_R = 6.5;        // 球壳半径（内壁）
const PANEL_RING_R_X = 3.0; // polyhedron X 半径（panels 横向距离）
const PANEL_RING_R_Z = 3.0; // polyhedron Z 半径（panels 纵深距离）
const PANEL_W_NATIVE = 2.8; // 面板原始宽度
const PANEL_H_NATIVE = 1.8; // 面板原始高度
const CAMERA_FOV_DEG = 70; // v64：60 → 70（与 SceneManager camera FOV 保持一致）
// 用户 v38：所有面共享同一个 y（同一个水平高度），多面体作为整圈在同一水平面
// 之前每面 y 不同（0.1 / 0 / -0.1 / ...）→ 转过去时面板上下飘；现在锁住单一高度。
const PANEL_Y = 0.1;       // polyhedron 各面板共享 y（略高于视线中心，留出底部按钮区）

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
  /** 用户 v53：当前 panel 形状（自适应 viewport aspect） */
  private panelW: number = PANEL_W_NATIVE;
  private panelH: number = PANEL_H_NATIVE;
  /** 用户 v53：当前 ring 半径（X / Z，根据 panel 宽度算保持面间距） */
  private ringRX: number = PANEL_RING_R_X;
  private ringRZ: number = PANEL_RING_R_Z;
  private textures: THREE.CanvasTexture[] = [];
  private buttonMeshes: THREE.Mesh[] = [];
  private panelMeshes: THREE.Mesh[] = [];
  private activePanelIndex = -1;
  /** 用户 v39：缩略图缓存（url → HTMLImageElement），加载完后触发面板纹理重建 */
  private imageCache = new Map<string, HTMLImageElement>();
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
    // 用户 v53：先按初始 viewport 算好 panel 形状 + ring 半径（构造期就该用）
    this.recomputePanelShape();
    const planeGeo = new THREE.PlaneGeometry(this.panelW, this.panelH);
    for (let i = 0; i < N; i++) {
      const panel = this.config.panels[i];
      const tex = drawPanel({
        title: panel.title,
        eyebrow: panel.eyebrow,
        // 用户 v39：面板只放图+短标题，详细 body/qaList 走 popup（不画在面板上）
        image: panel.image,
        imageLabel: panel.imageLabel,
        // 用户 v50：thumbnail 位置统一（紧挨着最后一排文字下一行 + 居中），只保留虚化
        thumbnailOpacity: panel.thumbnailOpacity,
        isDark: true,
        // 用户 v54：传入 panel 尺寸，让 canvas 比例 = panel 比例（不拉伸文字）
        panelW: this.panelW,
        panelH: this.panelH,
      });
      this.textures.push(tex);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 1.0,
      });
      const mesh = new THREE.Mesh(planeGeo, mat);
      const angle = (2 * Math.PI * i) / N;
      const x = Math.sin(angle) * this.ringRZ;
      const z = -Math.cos(angle) * this.ringRZ; // z 朝向相机为负
      // 用户 v38：所有面板共享同一 y（单一水平高度），多面体作为整圈在同一水平面
      mesh.position.set(x, PANEL_Y, z);
      // 让面板朝向中心（lookAt 球心）
      mesh.lookAt(0, PANEL_Y, 0);
      mesh.userData.angle = angle;
      mesh.userData.index = i;
      this.panelMeshes.push(mesh);
      this.scene.add(mesh);
    }

    // 用户 v47：在多面体上方放产品名 3D 文字（独立 mesh，不随多面体旋转）
    //   用户 v47 反馈："第一个页面 可以不要title 比如acecrush craft / swing analysis
    //   放到多面体上方去 拖拽翻页的时候 也不用变 Text3d效果也行"
    // → 之前 eyebrow 是放在 intro 面板上；现在抽出来放在多面体上方独立 plane
    this.createProductTitleMesh();

    // 用户 v39：预加载每个面板的缩略图，下载完后 rebuildPanelTexture 把图贴上
    this.preloadPanelImages();

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

    // 6) OrbitControls：相机锁在多面体中心，只绕中心旋转方向
    // 用户 v39：之前 target=(0,0,-1) → 旋转时 camera 绕 (0,0,-1) 走圆周，
    //   与 panel ring 中心 (0,0,0) 不同心，导致 panel 与 camera 距离随旋转变化
    //   （不同 panel 转正面时大小不一）。现在 target = 多面体中心 (0, PANEL_Y, 0)，
    //   min/maxDistance 都 = 0.01 锁死 camera 在中心，只让 yaw/polar 改变朝向。
    // 用户 2026-09-11 v12：拖拽方向反转（rotateSpeed = -0.8，负值反向）
    this.camera.position.set(0, PANEL_Y, 0.01);
    this.controls.target.set(0, PANEL_Y, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = -0.8;  // 反向 + 略慢
    // 用户 v39：锁住 camera-to-target 距离 → camera 永远在多面体中心
    this.controls.minDistance = 0.01;
    this.controls.maxDistance = 0.01;
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

    // 用户 v47：产品名 3D 文字始终面向相机（billboard），
    //   旋转多面体时文字保持正向不变
    if (this.productTitleMesh) {
      this.productTitleMesh.lookAt(this.camera.position);
    }

    // 接缝光带缓慢流动（标志性瞬间）
    if (this.tubeMesh && !this.reduce) {
      const t = performance.now() / 1000;
      const mat = this.tubeMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.25 + Math.sin(t * 0.6) * 0.1;
    }

    // 用户 v32：detail popup 打开时强制 active 面板（跳过几何检测）
    if (this.detailActiveIndex !== null) {
      // 用户 v59：所有面都可见（不再只显示 3 个），按 facing 渐变
      this.camera.getWorldDirection(this.cameraDir);
      const activeIdx = this.detailActiveIndex;
      for (let i = 0; i < this.panelMeshes.length; i++) {
        const mesh = this.panelMeshes[i];
        const normal = mesh.position.clone().normalize().negate();
        const facing = -normal.dot(this.cameraDir);
        mesh.visible = true;
        if (i === activeIdx) {
          mesh.scale.set(1, 1, 1);
          (mesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
          continue;
        }
        const visibility = Math.max(0, Math.min(1, (facing + 1) / 2));
        const scale = 0.5 + 0.35 * visibility;
        const opacity = 0.18 + 0.57 * visibility;
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
      // 记录最朝相机的面板（用于高亮边框）
      if (facing > bestFacing) {
        bestFacing = facing;
        bestIndex = i;
      }
    }
    // 用户 v59：放弃 v56 的"只显示 3 面"做法（用户反馈"看不到多面体效果 每个面 不要只显示一个"）
    //   → 改回所有面都可见，但按 facing 渐变 scale + opacity
    //   → 增强多面体感：所有面都能看到，active 最亮，侧面渐暗，远侧更暗
    for (let i = 0; i < this.panelMeshes.length; i++) {
      const mesh = this.panelMeshes[i];
      const normal = mesh.position.clone().normalize().negate();
      const facing = -normal.dot(this.cameraDir);
      mesh.visible = true;
      if (i === bestIndex) {
        // 用户 v39：active 面板恒为 scale 1.0 + opacity 1.0
        mesh.scale.set(1, 1, 1);
        (mesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
        continue;
      }
      // v59：所有非 active 面按 facing 渐变 scale + opacity（不再隐藏）
      //   facing = 1（正对相机）→ scale 0.85, opacity 0.75
      //   facing = 0（垂直侧面）→ scale 0.65, opacity 0.45
      //   facing = -1（背面）→ scale 0.5, opacity 0.18
      const visibility = Math.max(0, Math.min(1, (facing + 1) / 2));
      const scale = 0.5 + 0.35 * visibility;
      const opacity = 0.18 + 0.57 * visibility;
      mesh.scale.set(scale, scale, 1);
      (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
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
    // 用户 v39：传入当前是否 active + 已缓存的 image element
    const imgEl = panel.image ? this.imageCache.get(panel.image) : undefined;
    const newTex = drawPanel({
      title: panel.title,
      eyebrow: panel.eyebrow,
      body: panel.body,
      image: panel.image,
      imageLabel: panel.imageLabel,
      // 用户 v50：thumbnail 位置统一（紧挨着最后一排文字下一行 + 居中），只保留虚化
      thumbnailOpacity: panel.thumbnailOpacity,
      _imageEl: imgEl,
      isDark,
      active,
      accent: this.config.accent,
      // 用户 v54：重建时也带上当前 panel 尺寸（让 canvas 比例 = panel 比例）
      panelW: this.panelW,
      panelH: this.panelH,
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

  /** 用户 v47：在多面体上方放产品名 3D 文字（独立 mesh，不随多面体旋转）
   *  位置：正上方 + 略偏向相机 + 始终面向相机（billboard） */
  private productTitleMesh: THREE.Mesh | null = null;
  private createProductTitleMesh() {
    const name = this.config.productName;
    if (!name) return;
    const tex = drawTextLabel({ text: name, isDark: true, fontSize: 96 });
    this.textures.push(tex);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    // mesh 尺寸：根据 text 长度估算。aspect = text.length * 0.6 / 1
    const aspect = Math.max(2.0, name.length * 0.6);
    const titleH = 0.5;
    const titleW = titleH * aspect;
    const geo = new THREE.PlaneGeometry(titleW, titleH);
    const mesh = new THREE.Mesh(geo, mat);
    // 位置：多面体上方 (PANEL_Y + 1.0)，略偏 z=0.01 朝向相机
    mesh.position.set(0, PANEL_Y + 1.05, -0.5);
    mesh.renderOrder = 5; // 比 panel 晚渲染
    this.productTitleMesh = mesh;
    this.scene.add(mesh);
  }

  /** 用户 v39：预加载所有面板缩略图，加载完成后重建该面板 CanvasTexture 把图贴上 */
  private preloadPanelImages() {
    for (let i = 0; i < this.config.panels.length; i++) {
      const url = this.config.panels[i].image;
      if (!url) continue;
      if (this.imageCache.has(url)) continue;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => {
        this.imageCache.set(url, img);
        // 重建该面板纹理（保留当前 active 状态）
        const isActive = i === this.activePanelIndex;
        this.rebuildPanelTexture(i, isActive);
      };
      img.onerror = () => {
        // 加载失败忽略：drawPanel 会显示占位文字
      };
      img.src = url;
    }
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
    const oldPanelW = this.panelW;
    const oldPanelH = this.panelH;
    this.width = this.mount.clientWidth || window.innerWidth;
    this.height = this.mount.clientHeight || window.innerHeight;
    // 用户 v53/v54：根据 viewport 重新算 panel 形状 + ring 半径
    //   - panel W/H 自适应 viewport aspect
    //   - target ratio = 0.5（v54：不要占满屏幕）
    //   - ring 半径跟随 panel 宽度调整（保持面间距合理）
    this.recomputePanelShape();
    // 用户 v54：尺寸变了 → geometry + texture 都要重建（canvas 比例 = panel 比例，
    //   文字不拉伸变形）
    const aspectChanged =
      oldPanelW !== this.panelW || oldPanelH !== this.panelH;
    for (let i = 0; i < this.panelMeshes.length; i++) {
      const mesh = this.panelMeshes[i];
      mesh.geometry.dispose();
      mesh.geometry = new THREE.PlaneGeometry(this.panelW, this.panelH);
      // 重新摆放：使用当前 ringRZ（环在 XZ 平面）
      const angle = (2 * Math.PI * i) / this.panelMeshes.length;
      const x = Math.sin(angle) * this.ringRZ;
      const z = -Math.cos(angle) * this.ringRZ;
      mesh.position.set(x, PANEL_Y, z);
      mesh.lookAt(0, PANEL_Y, 0);
      // 重建 texture（让 canvas 比例 = panel 比例，不拉伸变形）
      if (aspectChanged) {
        const wasActive = i === this.activePanelIndex;
        this.rebuildPanelTexture(i, wasActive);
      }
    }
    // 产品名 3D 文字（v47）跟随 panel 宽度缩放
    if (this.productTitleMesh) {
      // title 跟 panel W 等比缩放（保持视觉协调）
      const titleScale = this.panelW / PANEL_W_NATIVE;
      this.productTitleMesh.scale.setScalar(titleScale);
    }
    // 同步 camera aspect
    if (this.camera) {
      this.camera.aspect = this.width / Math.max(1, this.height);
      this.camera.updateProjectionMatrix();
    }
  }

  /** 用户 v53：根据 viewport aspect 算 panel 宽高 + ring 半径
   *  - 桌面 16:9 (aspect≈1.78) 或接近 1:1 (1400x1280 ≈1.09): panel 略宽或接近方形
   *  - 手机 portrait (aspect≈0.36): panel 是竖矩形，宽 << 高
   *  - panel 高度固定 ≈ target_ratio * screen_H_world（不让 panel 上下撑出）
   *  - panel 宽度 = panel_H * viewport_aspect（让 panel 形状跟 viewport 形状一致）
   *  - ring 半径 ≈ panel_W * 1.15 / angleStep（保证面与面不重叠、不太开）
   */
  private recomputePanelShape() {
    const aspect = this.width / Math.max(1, this.height);
    const tanHalfFov = Math.tan((CAMERA_FOV_DEG * Math.PI / 180) / 2);
    // 在 ring 距离上，camera 能看到的 world 高度（v62：用缩小的 ring_R）
    const PANEL_RING_R_V62 = 2.0; // v62：从 3.0 缩到 2.0（用户：要缩小面于面间距）
    const screenHeightWorld = 2 * PANEL_RING_R_V62 * tanHalfFov;
    // target ratio：panel 高度占屏幕高度的 ~50%（移动 / 桌面都用同一个）
    const targetRatio = 0.5; // v54：0.6 → 0.5，content 上下左右各留 ~25% 空
    this.panelH = targetRatio * screenHeightWorld;
    // panel 宽度跟 viewport 一致：宽屏 = 宽面板，手机竖屏 = 窄长方
    this.panelW = this.panelH * aspect;
    // 用户 v55+v62：ring 半径统一 + 缩小 → 所有 polyhedron 视觉尺寸一致 + 紧凑
    //   之前：ring = panel_W * 1.15 / angleStep → 5 面 swing ring 小 → 看起来大
    //   现在：固定 ring = 2.0（v55 统一 + v62 缩小），swing/craft 大小 + 间距一致
    this.ringRZ = PANEL_RING_R_V62;
    this.ringRX = PANEL_RING_R_V62;
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