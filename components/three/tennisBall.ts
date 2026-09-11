/**
 * 共享网球几何 + marker 坐标工具（plan 003 §4-1）。
 *
 * 从 components/brand/TennisBallGlobe.tsx 逐字节搬出：
 *   - MarkerSpec / MarkerAnchor 类型
 *   - buildBallWithSeams / buildSeamRibbon / tennisSeamPoint
 *   - latLonToMarkerPos 经纬度换算
 *
 * hero 版与全屏 Hub 版共用，保证视觉与行为 1:1 一致。
 */

import * as THREE from "three";

export type MarkerSpec = {
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
  /** 点击 tooltip 跳转的页内锚点（如 "#craft"） */
  targetId: string;
};

export type MarkerAnchor = {
  x: number;
  y: number;
  facing: boolean;
  spec: MarkerSpec;
};

/**
 * 经纬度 → 球面坐标（与 plan 002 hero 版 for 循环内公式 1:1 一致）。
 * lat: 北正南负（deg）；lon: 东正西负（deg）；r: 球面半径。
 */
export function latLonToMarkerPos(
  lat: number,
  lon: number,
  r: number
): THREE.Vector3 {
  // 经度转 theta（绕 y 轴），纬度转 phi（从北极起）
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

/**
 * 真实网球接缝几何建模（plan 002 / 参考实现，浏览器已验证）：
 *
 *   Hirano / Alexander 网球曲线（球面闭曲线，x^2 + y^2 + z^2 = R^2）：
 *     x(t) = a*cos(t) + b*cos(3t)
 *     y(t) = a*sin(t) - b*sin(3t)
 *     z(t) = 2*sqrt(ab) * sin(2t)
 *
 *   b = a/3, R = a + b = 4a/3 → a = 3R/4, b = R/4。
 *
 *   单条曲线（不旋转、不复制），绕 Y 轴呈 3D 8 字形，自然经过两极。
 *
 *   渲染：
 *     - 球体顶点沿曲线方向做高斯凹槽（depth 0.045R, width 0.075R）
 *     - 曲线中心位置（凹槽底 75% 深度）放白色 ribbon（width 0.018R）
 *
 *   不是贴图，是真实 3D 几何 → 旋转 / 光照 / 投影都自然。
 */
export function buildBallWithSeams(
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

  // 2. 球体几何 + 沿接缝做高斯凹槽变形
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

  // 3. 球面材质（plan 002：调暗到 0x7d8c0a）
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
 *   side   = N × T（球面横向）
 *   left / right = center ± side × width / 2
 *   normal 指向球心外
 */
export function buildSeamRibbon(
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