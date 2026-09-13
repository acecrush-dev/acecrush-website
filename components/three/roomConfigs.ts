/**
 * 房间配置（plan 003 §5 内容映射表 + 用户 2026-09-11 v11 多面更紧凑）。
 *
 * 用户 2026-09-11 v11：4 面 = 90°，5 面 = 72°，6 面 = 60° 间距。
 * 现在每个产品 6 面（craft 7 / swing 6），间距比之前小，面与面更紧凑。
 *
 * craft 内容更多（5 features）→ 7 面（51° 间距）。
 * swing 内容较少（3 features）→ 5 面（72° 间距）。
 *
 * 用户 v38：所有面板共享同一水平高度（y 由 RoomScene 内的 PANEL_Y 统一决定），
 * 这里不再写 per-panel y，多面体作为整圈在同一水平面；转动时面与面平移切换，
 * 不再有上下飘。
 */

import * as THREE from "three";
import type { RoomConfig } from "./RoomScene";

export function buildCraftConfig(opts: {
  productName: string;
  intro: {
    eyebrow: string;
    headline: string;
    subtext: string;
    shortSubtext: string;
  };
  features: {
    item1Title: string; item1Body: string; item1Short: string;
    item2Title: string; item2Body: string; item2Short: string;
    item3Title: string; item3Body: string; item3Short: string;
    item4Title: string; item4Body: string; item4Short: string;
    item5Title: string; item5Body: string; item5Short: string;
  };
  faq: { q1: string; a1: string; q2: string; a2: string; q3: string; a3: string };
  buttonLabels: { back: string; switch: string; download: string; docs: string };
}): RoomConfig {
  return {
    id: "craft",
    productName: opts.productName,
    accent: "#2563EB",
    buttonLabels: opts.buttonLabels,
    // 用户 v68：craft 7 面 → polyhedronStyle='no-overlap'
    //   - panelW < arc_length（留 5% gap），面与面不重叠
    //   - targetRatio = π/(N × tanHalfFov × aspect) × 0.95
    polyhedronStyle: "no-overlap",
    // 7 面：intro + 5 features + faq ≈ 51° 间距（用户 v38/v39/v45/v50 全部同高 PANEL_Y）
    // v45：每个 panel 都有简化的 i18n shortSubtext；FAQ 没有图
    // v47：intro 第一个面板去掉 eyebrow（产品名放到多面体上方 3D 文字）
    // v50：缩略图统一位置（紧挨着最后一排文字下一行 + 居中），不再每面板随机
    //   → 不同 panel 通过 thumbnailOpacity 区分（清晰 vs 虚化）
    panels: [
      {
        title: opts.intro.headline,
        body: opts.intro.shortSubtext,
        image: "/img/craft/measurement_result.jpg",
        imageLabel: opts.intro.headline,
        thumbnailOpacity: 0.95,
      },
      {
        title: opts.features.item1Title,
        body: opts.features.item1Short,
        image: "/img/craft/grip_measurement.jpg",
        imageLabel: opts.features.item1Title,
        thumbnailOpacity: 0.9,
      },
      {
        title: opts.features.item2Title,
        body: opts.features.item2Short,
        image: "/img/craft/adjustment.jpg",
        imageLabel: opts.features.item2Title,
        thumbnailOpacity: 0.85,
      },
      {
        title: opts.features.item3Title,
        body: opts.features.item3Short,
        image: "/img/craft/racquet_list.jpg",
        imageLabel: opts.features.item3Title,
        thumbnailOpacity: 0.8,
      },
      {
        title: opts.features.item4Title,
        body: opts.features.item4Short,
        image: "/img/craft/string_job.jpg",
        imageLabel: opts.features.item4Title,
        thumbnailOpacity: 0.75,
      },
      {
        title: opts.features.item5Title,
        body: opts.features.item5Short,
        image: "/img/craft/dt_rt.jpg",
        imageLabel: opts.features.item5Title,
        thumbnailOpacity: 0.7,
      },
      {
        // v45：FAQ 面板：只放标题，不配图
        title: "FAQ",
        body: "",
      },
    ],
    buttons: [
      { action: "back", position: new THREE.Vector3(-2.4, -2.4, 0) },
      { action: "switch", position: new THREE.Vector3(-1.2, -2.4, 0) },
      { action: "docs", position: new THREE.Vector3(0, -2.4, 0) },
      { action: "download", position: new THREE.Vector3(1.2, -2.4, 0) },
    ],
  };
}

export function buildSwingConfig(opts: {
  productName: string;
  intro: {
    headline: string;
    subtext: string;
    shortSubtext: string;
  };
  features: {
    item1Title: string; item1Body: string; item1Short: string;
    item2Title: string; item2Body: string; item2Short: string;
    item3Title: string; item3Body: string; item3Short: string;
  };
  faq: { q1: string; a1: string; q2: string; a2: string; q3: string; a3: string };
  buttonLabels: { back: string; switch: string; download: string; docs: string };
}): RoomConfig {
  return {
    id: "swing",
    productName: opts.productName,
    accent: "#DC2626",
    buttonLabels: opts.buttonLabels,
    // 用户 v68：swing 5 面 → polyhedronStyle='overlap-ok'
    //   - panel_angular_size > gap（72°），邻面可见（之前 ratio=0.5 时只看到 1 面）
    //   - targetRatio = max(0.5, justTouchRatio × 1.2)
    polyhedronStyle: "overlap-ok",
    // 5 面：intro + 3 features + faq ≈ 72° 间距（用户 v38/v39/v45）
    panels: [
      {
        title: opts.intro.headline,
        eyebrow: "Swing Analysis",
        body: opts.intro.shortSubtext,
        image: "/img/swing/clip_play.png",
        imageLabel: opts.intro.headline,
      },
      {
        title: opts.features.item1Title,
        body: opts.features.item1Short,
        image: "/img/swing/load_video.png",
        imageLabel: opts.features.item1Title,
      },
      {
        title: opts.features.item2Title,
        body: opts.features.item2Short,
        image: "/img/swing/load_video.png",
        imageLabel: opts.features.item2Title,
      },
      {
        title: opts.features.item3Title,
        body: opts.features.item3Short,
        image: "/img/swing/clip_play.png",
        imageLabel: opts.features.item3Title,
      },
      {
        // v45：FAQ 面板：只放标题，不配图
        title: "FAQ",
        body: "",
      },
    ],
    buttons: [
      { action: "back", position: new THREE.Vector3(-2.4, -2.0, 0) },
      { action: "switch", position: new THREE.Vector3(-1.2, -2.0, 0) },
      { action: "docs", position: new THREE.Vector3(0, -2.0, 0) },
      { action: "download", position: new THREE.Vector3(1.2, -2.0, 0) },
    ],
  };
}
