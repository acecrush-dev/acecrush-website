/**
 * 房间配置（plan 003 §5 内容映射表 + 用户 2026-09-11 v11 多面更紧凑）。
 *
 * 用户 2026-09-11 v11：4 面 = 90°，5 面 = 72°，6 面 = 60° 间距。
 * 现在每个产品 6 面（craft 7 / swing 6），间距比之前小，面与面更紧凑。
 *
 * craft 内容更多（5 features）→ 7 面（51° 间距）。
 * swing 内容较少（3 features）→ 5 面（72° 间距）。
 */

import * as THREE from "three";
import type { RoomConfig } from "./RoomScene";

export function buildCraftConfig(opts: {
  intro: { eyebrow: string; headline: string; subtext: string };
  features: {
    item1Title: string; item1Body: string;
    item2Title: string; item2Body: string;
    item3Title: string; item3Body: string;
    item4Title: string; item4Body: string;
    item5Title: string; item5Body: string;
  };
  faq: { q1: string; a1: string; q2: string; a2: string; q3: string; a3: string };
  buttonLabels: { back: string; switch: string; download: string; docs: string };
}): RoomConfig {
  return {
    id: "craft",
    accent: "#2563EB",
    buttonLabels: opts.buttonLabels,
    // 7 面：intro + 5 features + faq ≈ 51° 间距（用户 v25 整体下移）
    panels: [
      {
        y: 0.1,
        title: opts.intro.headline,
        eyebrow: opts.intro.eyebrow || "AceCrush Craft",
        body: opts.intro.subtext,
      },
      {
        y: 0,
        title: opts.features.item1Title,
        body: opts.features.item1Body,
      },
      {
        y: -0.1,
        title: opts.features.item2Title,
        body: opts.features.item2Body,
      },
      {
        y: -0.2,
        title: opts.features.item3Title,
        body: opts.features.item3Body,
      },
      {
        y: -0.3,
        title: opts.features.item4Title,
        body: opts.features.item4Body,
      },
      {
        y: -0.4,
        title: opts.features.item5Title,
        body: opts.features.item5Body,
      },
      {
        y: -0.3,
        title: "FAQ",
        qaList: [
          { q: opts.faq.q1, a: opts.faq.a1 },
          { q: opts.faq.q2, a: opts.faq.a2 },
          { q: opts.faq.q3, a: opts.faq.a3 },
        ],
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
  intro: { headline: string; subtext: string };
  features: {
    item1Title: string; item1Body: string;
    item2Title: string; item2Body: string;
    item3Title: string; item3Body: string;
  };
  faq: { q1: string; a1: string; q2: string; a2: string; q3: string; a3: string };
  buttonLabels: { back: string; switch: string; download: string; docs: string };
}): RoomConfig {
  return {
    id: "swing",
    accent: "#DC2626",
    buttonLabels: opts.buttonLabels,
    // 5 面：intro + 3 features + faq ≈ 72° 间距（用户 v25 整体下移）
    panels: [
      {
        y: 0.1,
        title: opts.intro.headline,
        eyebrow: "Swing Analysis",
        body: opts.intro.subtext,
      },
      {
        y: 0,
        title: opts.features.item1Title,
        body: opts.features.item1Body,
      },
      {
        y: -0.1,
        title: opts.features.item2Title,
        body: opts.features.item2Body,
      },
      {
        y: -0.2,
        title: opts.features.item3Title,
        body: opts.features.item3Body,
      },
      {
        y: -0.3,
        title: "FAQ",
        qaList: [
          { q: opts.faq.q1, a: opts.faq.a1 },
          { q: opts.faq.q2, a: opts.faq.a2 },
          { q: opts.faq.q3, a: opts.faq.a3 },
        ],
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
