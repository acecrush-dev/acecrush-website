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
import { TweenGroup } from "./tween";
import { GlobeScene } from "./GlobeScene";
import { RoomScene, type RoomConfig } from "./RoomScene";
import {
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
  roomConfigs: { craft: RoomConfig; swing: RoomConfig };
  buttonLabels: { back: string; switch: string; download: string; docs: string };
  switchUrls: { craft: string; swing: string };
};

export class SceneManager {
  private mount: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private tweenGroup = new TweenGroup();
  private raf = 0;
  private lastTime = 0;
  private running = true;
  private activeScene: GlobeScene | RoomScene | null = null;
  private activeView: View = "globe";
  private resizeObserver: ResizeObserver | null = null;
  private onContextLost: ((e: Event) => void) | null = null;
  private onVisibilityChange: (() => void) | null = null;
  private pointerMoveHandler: ((e: PointerEvent) => void) | null = null;
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private opts: SceneManagerOpts;
  private viewCheckInterval: ReturnType<typeof setInterval> | null = null;

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

    this.camera = new THREE.PerspectiveCamera(
      45,
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

    // 启动初始 scene
    this.activateScene(getViewState().view);

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

    // 监听 viewStore 变化（globe ↔ craft / swing）
    this.viewCheckInterval = setInterval(() => {
      const v = getViewState().view;
      if (v !== this.activeView) {
        this.activateScene(v);
      }
    }, 100);

    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private activateScene(view: View) {
    // 先 dispose 旧场景
    this.activeScene?.dispose();
    this.activeView = view;

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
        reduced: this.opts.reduced,
      });
      this.activeScene.resize();
    }
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
    this.activeScene?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.mount) {
      this.mount.removeChild(this.renderer.domElement);
    }
  }
}