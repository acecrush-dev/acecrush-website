/**
 * 品牌 3D 文字（plan 003 + 用户 2026-09-11 v6："AceCrush 用 Text3D"）。
 *
 * 用 three.js TextGeometry + FontLoader 从 three.js CDN 加载 helvetiker 字体；
 * 若 CDN 加载失败，回退到 CanvasTexture 渲染方式（仍然"3D"，文字纹理贴在
 * PlaneGeometry 上，可在场景中旋转/光照/缩放）。
 *
 * 字号 / 深度 / 颜色由调用方传参。返回的 group 已经建好 mesh，需要 dispose 时
 * 调用 dispose()。
 */

import * as THREE from "three";

export type BrandTextOpts = {
  text: string;
  size?: number;
  height?: number; // TextGeometry 的深度
  color?: number;
  emissive?: number;
  emissiveIntensity?: number;
  /** fallback canvas 模式下的字体大小（px，2x DPR 缩放后） */
  fontSize?: number;
};

export type BrandTextHandle = {
  group: THREE.Group;
  dispose: () => void;
  /** fallback canvas 重建（如 i18n 切换 locale） */
  rebuild: () => void;
};

const CDN_FONT_URL =
  "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json";

/**
 * 创建品牌 3D 文字。异步：尝试加载 CDN 字体；失败后用 CanvasTexture 渲染。
 * 即使字体未加载完成也立即返回 group（先 canvas mesh 占位，字体好之后替换）。
 */
export function createBrandText(opts: BrandTextOpts): BrandTextHandle {
  const {
    text,
    size = 0.6,
    height = 0.12,
    color = 0xffffff,
    emissive = 0xffffff,
    emissiveIntensity = 0.25,
    fontSize = 96,
  } = opts;

  const group = new THREE.Group();
  let currentMesh: THREE.Mesh | null = null;
  let currentTexture: THREE.CanvasTexture | null = null;
  let currentGeometry: THREE.BufferGeometry | null = null;
  let loadedFont: unknown = null;

  const fallbackMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: 0xffffff,
    emissiveIntensity: 0.18,
    emissiveMap: null,
    roughness: 0.6,
    metalness: 0.0,
    transparent: true,
    side: THREE.DoubleSide,
  });

  function buildCanvasMesh() {
    // Fallback：CanvasTexture 渲染文字 → PlaneGeometry
    const padding = 24;
    const c = document.createElement("canvas");
    // 临时测量
    const measureCtx = c.getContext("2d")!;
    measureCtx.font = `700 ${fontSize}px "Space Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    const metrics = measureCtx.measureText(text);
    const W = Math.ceil(metrics.width) + padding * 2;
    const H = fontSize * 1.4 + padding * 2;
    c.width = W * 2;
    c.height = H * 2;
    const ctx = c.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.font = `700 ${fontSize}px "Space Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(255,255,255,0.4)";
    ctx.shadowBlur = 12;
    ctx.fillText(text, W / 2, H / 2);
    ctx.shadowBlur = 0;
    // 二次描边强化对比
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.fillText(text, W / 2, H / 2);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 16;
    tex.needsUpdate = true;

    // 计算 mesh 尺寸：W:H 长宽比，缩放到目标视觉宽度
    const visualWidth = text.length * 0.7;
    const aspect = W / H;
    const visualHeight = visualWidth / aspect;
    const geo = new THREE.PlaneGeometry(visualWidth, visualHeight);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    return { mesh, tex, geo, mat };
  }

  function buildTextMesh(fontObj: { generateShapes: (text: string, size: number) => unknown[] }) {
    // 动态加载 TextGeometry（避免 SSR）
    // 通过 require 异步导入，调用方在客户端场景中调用
    // 这里直接走 globalThis 上的 THREE 命名空间拿 TextGeometry
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TextGeometryCtor = (
      globalThis as { __TextGeometry?: unknown }
    ).__TextGeometry as unknown;
    if (!TextGeometryCtor) {
      throw new Error("TextGeometry not loaded");
    }
    const TG = TextGeometryCtor as new (
      text: string,
      params: {
        font: unknown;
        size: number;
        height: number;
        curveSegments?: number;
        bevelEnabled?: boolean;
        bevelThickness?: number;
        bevelSize?: number;
        bevelOffset?: number;
        bevelSegments?: number;
      }
    ) => THREE.BufferGeometry;
    const shapes = fontObj.generateShapes(text, size) as THREE.Shape[];
    const geo = new TG(text, {
      font: fontObj as never,
      size,
      height,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.015,
      bevelOffset: 0,
      bevelSegments: 4,
    });
    geo.computeBoundingBox();
    // 居中（origin 居中）
    const bbox = geo.boundingBox!;
    const cx = (bbox.max.x - bbox.min.x) / 2;
    geo.translate(-cx, 0, 0);
    return geo;
  }

  // 异步加载真实 TextGeometry（成功则替换 fallback mesh）
  async function tryLoadTextGeometry() {
    if (typeof window === "undefined") return;
    try {
      const [{ FontLoader }, tgMod] = await Promise.all([
        import("three/examples/jsm/loaders/FontLoader.js"),
        import("three/examples/jsm/geometries/TextGeometry.js"),
      ]);
      (globalThis as { __TextGeometry?: unknown }).__TextGeometry =
        tgMod.TextGeometry;
      const loader = new FontLoader();
      loader.load(
        CDN_FONT_URL,
        (font) => {
          loadedFont = font;
          // 替换 fallback mesh
          try {
            const geo = buildTextMesh(font as never);
            const mat = new THREE.MeshStandardMaterial({
              color,
              emissive,
              emissiveIntensity,
              roughness: 0.5,
              metalness: 0.1,
            });
            const mesh = new THREE.Mesh(geo, mat);
            // 替换：先清掉 fallback
            if (currentMesh) {
              group.remove(currentMesh);
              if (currentMesh.geometry) currentMesh.geometry.dispose();
              if (currentMesh.material instanceof THREE.Material) {
                (currentMesh.material as THREE.Material).dispose();
              }
              if (currentTexture) {
                currentTexture.dispose();
                currentTexture = null;
              }
            }
            currentMesh = mesh;
            currentGeometry = geo;
            group.add(mesh);
          } catch (err) {
            console.warn("[brandText] failed to build TextGeometry, keeping canvas fallback", err);
          }
        },
        undefined,
        (err) => {
          console.warn("[brandText] font CDN failed, keeping canvas fallback", err);
        }
      );
    } catch (err) {
      console.warn("[brandText] dynamic import failed", err);
    }
  }

  // 同步先放一个 fallback mesh（canvas 渲染，立即可见）
  const fb = buildCanvasMesh();
  currentMesh = fb.mesh;
  currentGeometry = fb.geo;
  currentTexture = fb.tex;
  // 用 MeshBasicMaterial 显示纹理（fallback 模式下就是 2D 文字渲染）
  group.add(fb.mesh);
  // 静音 fallback material 警告（fallbackMaterial 暂未用）
  void fallbackMaterial;

  // 异步尝试升级到真 TextGeometry
  tryLoadTextGeometry();

  function dispose() {
    if (currentMesh) {
      group.remove(currentMesh);
      if (currentMesh.geometry) currentMesh.geometry.dispose();
      const mat = currentMesh.material;
      if (mat instanceof THREE.Material) mat.dispose();
    }
    if (currentTexture) currentTexture.dispose();
  }

  function rebuild() {
    dispose();
    const fb2 = buildCanvasMesh();
    currentMesh = fb2.mesh;
    currentGeometry = fb2.geo;
    currentTexture = fb2.tex;
    group.add(fb2.mesh);
  }

  return { group, dispose, rebuild };
}