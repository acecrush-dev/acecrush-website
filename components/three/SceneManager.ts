/**
 * SceneManager（plan 003 §4-8 / §3-4 + 用户 2026-09-11 转向）。
 *
 * 持有：
 *   - 单 renderer（移动端 DPR 上限 1.75）
 *   - 单 RAF（document.hidden 时暂停 / 恢复）
 *   - ResizeObserver（mount 尺寸变化时同步）
 *   - TweenGroup（场景过渡时间线）
 *   - 当前激活的 Scene（GlobeScene / RoomScene）
 *   - 监听 viewStore.view 变化，globe ↔ craft/swing 切换
 *
 * 监听：
 *   - webglcontextlost → setWebglOk(false)（用户 2026-09-11：放弃 classic，不再降级）
 *   - document.visibilitychange → 暂停 / 恢复 RAF
 *
 * 房间配置（RoomConfig）参数化：craft 与 swing 各一份，按 viewStore.view 选择。
 */

import * as THREE from "three";
import { TweenGroup, easeInOutCubic, easeOutQuart, easeInQuad } from "./tween";
import { GlobeScene } from "./GlobeScene";
import { RoomScene, type RoomConfig } from "./RoomScene";
import {
  getDetailView,
  getViewState,
  setWebglOk,
  requestEnter,
  requestExit,
  type View,
} from "@/lib/three/viewStore";

export type SceneManagerOpts = {
  mount: HTMLElement;
  labels: { craft: string; swing: string };
  reduced: boolean;
  onMarkerActivate?: (marker: "craft" | "swing") => void;
  /** 用户 v20：双击面板进入详细 popup */
  onPanelActivate?: (product: "craft" | "swing", panelIndex: number) => void;
  roomConfigs: { craft: RoomConfig; swing: RoomConfig };
  buttonLabels: { back: string; switch: string; download: string; docs: string };
  switchUrls: { craft: string; swing: string };
};

export class SceneManager {
  /** v71：hub 基础 FOV（房间场景由 RoomScene.build 按 config.polyhedron.fov 覆写） */
  private static readonly BASE_FOV = 70;

  private mount: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private tweenGroup = new TweenGroup();
  private raf = 0;
  private lastTime = 0;
  private running = true;
  private activeScene: GlobeScene | RoomScene | null = null;
  private activeView: View = "globe";
  /** 用户 v32：detail popup 激活的面板索引（用于同步背景几面体） */
  private detailActiveIdx: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private onContextLost: ((e: Event) => void) | null = null;
  private onVisibilityChange: (() => void) | null = null;
  private pointerMoveHandler: ((e: PointerEvent) => void) | null = null;
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private dblclickHandler: ((e: MouseEvent) => void) | null = null;
  /** 用户 v76：移动端双击面板检测（触摸设备原生 dblclick 不可靠） */
  private touchTapHandler: ((e: PointerEvent) => void) | null = null;
  private lastTap = { time: 0, x: 0, y: 0 };
  private opts: SceneManagerOpts;
  private viewCheckInterval: ReturnType<typeof setInterval> | null = null;
  /**
   * 用户 v86：球皮穿越过渡。
   * 用户 v87：白幕改为暗幕渐隐（用户反馈"白屏不好看 要 faded 效果"）：
   *   veil 取壳层背景色 #0e1410，入/出全走 ease 渐隐曲线（dip-to-dark），
   *   全遮保持压到最短（约 0.3s 的穿皮暗拍，不再整段白屏）。
   * veil opacity 由过渡时间线逐帧驱动：
   *   globe → room：相机向球心 dolly + FOV 收缩（隧道感），暗幕在相机触到球皮前
   *     渐隐至全遮，全遮瞬间硬切场景，房间以 FOV 偏窄 + 相机靠后墙的姿态进场，
   *     滑到中心并展开 FOV，暗幕同步渐显 → 「从球外穿过球皮进入球内」的渐进感。
   *   room → globe：FOV 收缩 + 暗幕罩下，切回 globe 后相机从球皮外侧（r ≈ 1.7）拉回
   *     取景距离，FOV 32 → 70，像从球里退出来。
   *   room → room：暗幕单次闪切（plan 003 §3-6 原案）。
   *   reduced-motion：维持硬切。
   */
  private veil: HTMLDivElement;
  private transitioning = false;
  private targetView: View = "globe";
  private pendingView: View | null = null;

  constructor(opts: SceneManagerOpts) {
    this.opts = opts;
    this.mount = opts.mount;
    const isMobile = window.innerWidth < 768;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.75 : 2);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(dpr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(
      this.mount.clientWidth || window.innerWidth,
      this.mount.clientHeight || window.innerHeight
    );
    this.mount.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute("role", "img");
    this.renderer.domElement.setAttribute("aria-label", "3D hub");

    // 用户 v86：过渡暗幕（挂在 canvas 之上、HUD 之下；不拦截指针）
    // 用户 v87：白幕 → 壳层同色暗幕（#0e1410），dip-to-dark 渐隐
    this.veil = document.createElement("div");
    this.veil.style.cssText = [
      "position:absolute",
      "inset:0",
      "z-index:5",
      "pointer-events:none",
      "background:#0e1410",
      "opacity:0",
    ].join(";");
    this.mount.appendChild(this.veil);

    this.camera = new THREE.PerspectiveCamera(
      // 用户 v63：45 → 60 FOV
      // 用户 v64：60 → 70 FOV（"可以再缩小间距"）
      // 用户 v71：抽成 BASE_FOV 常量（房间可按 config.polyhedron.fov 覆写，切回 hub 还原）
      SceneManager.BASE_FOV,
      (this.mount.clientWidth || window.innerWidth) /
        (this.mount.clientHeight || window.innerHeight),
      0.01,
      100
    );

    this.onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglOk(false);
    };
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.onContextLost
    );

    this.onVisibilityChange = () => {
      if (document.hidden) {
        this.running = false;
      } else if (!this.running) {
        this.running = true;
        this.lastTime = performance.now();
        this.raf = requestAnimationFrame(this.loop);
      }
    };
    document.addEventListener("visibilitychange", this.onVisibilityChange);

    this.resizeObserver = new ResizeObserver(() => {
      const w = this.mount.clientWidth || window.innerWidth;
      const h = this.mount.clientHeight || window.innerHeight;
      this.renderer.setSize(w, h);
      this.activeScene?.resize();
    });
    this.resizeObserver.observe(this.mount);

    // 启动初始 scene（首挂载直接硬切，无过渡；#craft/#swing 深链同此路径）
    this.targetView = getViewState().view;
    this.activateScene(this.targetView);

    this.pointerMoveHandler = (e: PointerEvent) => {
      if (this.activeScene instanceof RoomScene) {
        this.activeScene.handlePointerMove(e);
      } else if (this.activeScene instanceof GlobeScene) {
        this.activeScene.handlePointerMove(e);
      }
    };
    this.renderer.domElement.addEventListener(
      "pointermove",
      this.pointerMoveHandler
    );
    this.clickHandler = (e: MouseEvent) => {
      if (this.activeScene instanceof RoomScene) {
        // click 事件没有完整 PointerEvent 字段；构造一个最小化的事件对象
        const pe = e as unknown as PointerEvent;
        this.activeScene.handleClick(pe);
      }
    };
    this.renderer.domElement.addEventListener("click", this.clickHandler);
    // 用户 v20：双击面板 → 详细 popup
    this.dblclickHandler = (e: MouseEvent) => {
      if (this.activeScene instanceof RoomScene) {
        const pe = e as unknown as PointerEvent;
        this.activeScene.handleDoubleClick(pe);
      }
    };
    this.renderer.domElement.addEventListener("dblclick", this.dblclickHandler);
    // 用户 v76：移动端双击面板 → 详细 popup。
    //   触摸设备基本不派发原生 dblclick（OrbitControls 已设 touch-action:none，
    //   双击不会触发页面缩放），故手动检测：两次 pointerup（pointerType=touch）
    //   间隔 < 350ms 且位移 < 24px 判定为双击。桌面仍走原生 dblclick，互不干扰。
    this.touchTapHandler = (e: PointerEvent) => {
      if (!(this.activeScene instanceof RoomScene)) return;
      if (e.pointerType !== "touch") return;
      const now = performance.now();
      const dt = now - this.lastTap.time;
      const dist = Math.hypot(
        e.clientX - this.lastTap.x,
        e.clientY - this.lastTap.y
      );
      this.lastTap = { time: now, x: e.clientX, y: e.clientY };
      if (dt < 350 && dist < 24) {
        // 重置时间戳，防止三连击触发两次 popup
        this.lastTap.time = 0;
        this.activeScene.handleDoubleClick(e);
      }
    };
    this.renderer.domElement.addEventListener("pointerup", this.touchTapHandler);

    // 监听 viewStore + detailView 变化
    this.viewCheckInterval = setInterval(() => {
      const v = getViewState().view;
      // 用户 v86：过渡进行中不重入，改记 pendingView，结束后补跑最新目标
      if (this.transitioning) {
        if (v !== this.targetView) this.pendingView = v;
        return;
      }
      if (v !== this.activeView) {
        this.transitionTo(v);
      }
      // 用户 v32：detail popup 打开时同步背景几面体的 active 面板
      // 用户 v65：popup 翻页时背景相机自动转到 highlight 面板（居中位置）
      const dv = getDetailView();
      const targetIdx = dv ? dv.panelIndex : null;
      if (targetIdx !== this.detailActiveIdx) {
        this.detailActiveIdx = targetIdx;
        if (this.activeScene instanceof RoomScene) {
          this.activeScene.setDetailActiveCenter(targetIdx);
        }
      }
    }, 100);

    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private activateScene(view: View) {
    // 先 dispose 旧场景
    this.activeScene?.dispose();
    this.activeView = view;

    // 用户 v71：先还原基础 FOV（每个场景激活时统一定起点；
    // 房间场景在 RoomScene.build 里按 config.polyhedron.fov 再覆写）
    this.camera.fov = SceneManager.BASE_FOV;
    this.camera.updateProjectionMatrix();

    if (view === "globe") {
      this.activeScene = new GlobeScene({
        mount: this.mount,
        camera: this.camera,
        renderer: this.renderer,
        labels: this.opts.labels,
        onMarkerActivate: (m) => {
          this.opts.onMarkerActivate?.(m.target as "craft" | "swing");
        },
      });
      this.activeScene.fitCamera();
      // 还原相机位置 / OrbitControls
      this.camera.position.set(0, 0.225, this.camera.position.z);
    } else {
      // craft / swing
      const config = this.opts.roomConfigs[view];
      this.activeScene = new RoomScene({
        mount: this.mount,
        camera: this.camera,
        renderer: this.renderer,
        config,
        onAction: (action) => this.handleRoomAction(action, view),
        onPanelActivate: (idx) => this.opts.onPanelActivate?.(view, idx),
        reduced: this.opts.reduced,
      });
      this.activeScene.resize();
    }
  }

  /**
   * 用户 v86：带「穿越球皮」渐进过渡的场景切换入口。
   * reduced-motion 或非法目标时退化为直接 activateScene（硬切）。
   */
  private transitionTo(view: View) {
    if (this.opts.reduced || view === this.activeView) {
      this.targetView = view;
      this.activateScene(view);
      return;
    }
    this.transitioning = true;
    this.targetView = view;
    const from = this.activeView;
    if (from === "globe") {
      this.enterRoom(view as "craft" | "swing");
    } else if (view === "globe") {
      this.exitRoom();
    } else {
      this.switchRoom(view);
    }
  }

  /** 过渡收尾：解锁轮询，若期间 view 又变了则补跑一段新过渡 */
  private finishTransition() {
    this.transitioning = false;
    if (this.pendingView !== null) {
      const next = this.pendingView;
      this.pendingView = null;
      if (next !== this.activeView) this.transitionTo(next);
    }
  }

  /** 读某房间生效的 FOV（与 RoomScene.build 的缺省规则一致） */
  private roomFov(room: "craft" | "swing"): number {
    return this.opts.roomConfigs[room].polyhedron.fov ?? 70;
  }

  /** globe → room：向球心 dolly + FOV 收缩，暗幕渐隐全遮后硬切，再从墙边滑入房间中心 */
  private enterRoom(room: "craft" | "swing") {
    const globe = this.activeScene as GlobeScene;
    globe.setTransitioning(true);
    // controls target 的 y（GlobeScene：移动端 0.4 / 桌面 0），dolly 期间保持同一视线
    const lookY = window.innerWidth < 768 ? 0.4 : 0;
    const z0 = this.camera.position.z;
    // v87：z1 取 0.9（球皮内侧但离面别太远）→ 穿面时刻 ≈ dolly 0.36s，
    //   暗幕 0.32s 全遮，穿面前已全暗（FrontSide cull 翻面被盖住）
    const z1 = 0.9;
    const f0 = SceneManager.BASE_FOV;
    const f1 = 32;
    this.tweenGroup.add({
      duration: 0.65,
      easing: easeInOutCubic,
      onUpdate: (t) => {
        this.camera.position.z = z0 + (z1 - z0) * t;
        this.camera.fov = f0 + (f1 - f0) * t;
        this.camera.updateProjectionMatrix();
        this.camera.lookAt(0, lookY, 0);
      },
    });
    // 暗幕渐隐（v87：0.32s 全遮即切，不再整段压屏）
    this.tweenGroup.add({
      duration: 0.32,
      easing: easeInOutCubic,
      onUpdate: (t) => {
        this.veil.style.opacity = String(t);
      },
      onComplete: () => {
        this.activateScene(room);
        this.revealRoom(room);
      },
    });
  }

  /** 房间揭幕：FOV 从偏窄展开到房间值 + 相机从后墙滑到球心，暗幕同步渐显 */
  private revealRoom(room: "craft" | "swing") {
    const roomScene = this.activeScene as RoomScene;
    roomScene.setTransitioning(true);
    const targetFov = this.roomFov(room);
    const z0 = 0.55;
    const z1 = 0.01; // RoomScene 的常规机位
    const f0 = targetFov * 0.68;
    this.camera.position.z = z0;
    this.camera.fov = f0;
    this.camera.updateProjectionMatrix();
    this.tweenGroup.add({
      duration: 0.85,
      easing: easeOutQuart,
      onUpdate: (t) => {
        this.camera.position.z = z0 + (z1 - z0) * t;
        this.camera.fov = f0 + (targetFov - f0) * t;
        this.camera.updateProjectionMatrix();
      },
      onComplete: () => {
        roomScene.setTransitioning(false);
        this.finishTransition();
      },
    });
    this.tweenGroup.add({
      duration: 0.6,
      easing: easeInOutCubic,
      onUpdate: (t) => {
        this.veil.style.opacity = String(1 - t);
      },
    });
  }

  /** room → globe：FOV 隧穿 + 暗幕罩下，切回 globe 后相机从球皮外侧退回取景位 */
  private exitRoom() {
    const roomScene = this.activeScene as RoomScene;
    roomScene.setTransitioning(true);
    const room = this.activeView as "craft" | "swing";
    const f0 = this.roomFov(room);
    const f1 = f0 * 0.7;
    this.tweenGroup.add({
      duration: 0.4,
      easing: easeInQuad,
      onUpdate: (t) => {
        this.camera.fov = f0 + (f1 - f0) * t;
        this.camera.updateProjectionMatrix();
      },
    });
    this.tweenGroup.add({
      duration: 0.4,
      easing: easeInOutCubic,
      onUpdate: (t) => {
        this.veil.style.opacity = String(t);
      },
      onComplete: () => {
        this.activateScene("globe");
        this.revealGlobe();
      },
    });
  }

  /** globe 揭幕：相机从球皮外侧（r ≈ 1.7）拉回 fitCamera 取景位，FOV 32 → 70 */
  private revealGlobe() {
    const globe = this.activeScene as GlobeScene;
    globe.setTransitioning(true);
    const lookY = window.innerWidth < 768 ? 0.4 : 0;
    const z0 = 1.7; // 球皮外侧一点（BALL_R = 1.5）
    const z1 = this.camera.position.z; // fitCamera 已在 activateScene 内设好终点
    const y1 = this.camera.position.y;
    const f0 = 32;
    const f1 = SceneManager.BASE_FOV;
    this.camera.position.z = z0;
    this.camera.fov = f0;
    this.camera.updateProjectionMatrix();
    this.tweenGroup.add({
      duration: 0.9,
      easing: easeOutQuart,
      onUpdate: (t) => {
        this.camera.position.set(0, y1, z0 + (z1 - z0) * t);
        this.camera.fov = f0 + (f1 - f0) * t;
        this.camera.updateProjectionMatrix();
        this.camera.lookAt(0, lookY, 0);
      },
      onComplete: () => {
        globe.setTransitioning(false);
        this.finishTransition();
      },
    });
    this.tweenGroup.add({
      duration: 0.6,
      easing: easeInOutCubic,
      onUpdate: (t) => {
        this.veil.style.opacity = String(1 - t);
      },
    });
  }

  /** room → room：暗幕单次闪切（plan 003 §3-6：房间直切 = 单次闪切） */
  private switchRoom(next: "craft" | "swing") {
    this.tweenGroup.add({
      duration: 0.25,
      easing: easeInOutCubic,
      onUpdate: (t) => {
        this.veil.style.opacity = String(t);
      },
      onComplete: () => {
        this.activateScene(next);
        this.tweenGroup.add({
          duration: 0.5,
          easing: easeInOutCubic,
          onUpdate: (t) => {
            this.veil.style.opacity = String(1 - t);
          },
          onComplete: () => this.finishTransition(),
        });
      },
    });
  }

  private handleRoomAction(action: "back" | "switch" | "download" | "docs", current: View) {
    if (action === "back") {
      requestExit();
      return;
    }
    if (action === "switch") {
      const next = current === "craft" ? "swing" : "craft";
      requestEnter(next);
      return;
    }
    if (action === "download") {
      const url =
        current === "craft"
          ? this.opts.switchUrls.craft
          : this.opts.switchUrls.swing;
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (action === "docs") {
      const url =
        current === "craft"
          ? "https://acecrush-dev.github.io/acecrush-craft-app/"
          : "https://acecrush-dev.github.io/swing-analysis-app/";
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
  }

  private loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.tweenGroup.update(dt);
    if (this.activeScene) {
      this.activeScene.update(dt);
      this.renderer.render(this.activeScene.getScene(), this.camera);
    }
  };

  getTweenGroup() {
    return this.tweenGroup;
  }

  getGlobeScene() {
    return this.activeScene instanceof GlobeScene ? this.activeScene : null;
  }

  applyLocale(labels: { craft: string; swing: string }) {
    this.opts.labels = labels;
    this.activeScene?.applyLocale(labels as never);
  }

  applyTheme() {
    this.activeScene?.applyTheme();
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    if (this.viewCheckInterval) {
      clearInterval(this.viewCheckInterval);
      this.viewCheckInterval = null;
    }
    if (this.onContextLost) {
      this.renderer.domElement.removeEventListener(
        "webglcontextlost",
        this.onContextLost
      );
      this.onContextLost = null;
    }
    if (this.onVisibilityChange) {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      this.onVisibilityChange = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.pointerMoveHandler) {
      this.renderer.domElement.removeEventListener(
        "pointermove",
        this.pointerMoveHandler
      );
      this.pointerMoveHandler = null;
    }
    if (this.clickHandler) {
      this.renderer.domElement.removeEventListener("click", this.clickHandler);
      this.clickHandler = null;
    }
    if (this.dblclickHandler) {
      this.renderer.domElement.removeEventListener("dblclick", this.dblclickHandler);
      this.dblclickHandler = null;
    }
    if (this.touchTapHandler) {
      this.renderer.domElement.removeEventListener("pointerup", this.touchTapHandler);
      this.touchTapHandler = null;
    }
    this.activeScene?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.mount) {
      this.mount.removeChild(this.renderer.domElement);
    }
    if (this.veil.parentElement === this.mount) {
      this.mount.removeChild(this.veil);
    }
  }
}