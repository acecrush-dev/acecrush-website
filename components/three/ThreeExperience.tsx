"use client";

/**
 * ThreeExperience - 3D 沉浸壳层（plan 003 §4-9 + 用户 2026-09-11 转向）。
 *
 * 用户 2026-09-11 转向：放弃 classic view，只有 3D。
 *   - nav 在 AppNav（永远可见），不再在 HUD 里重复 LocaleSwitcher/ThemeSwitcher
 *   - 移除 mode toggle 按钮
 *   - WebGL 不可用：显示 webglFallback 提示（不再降级到经典页）
 *
 * 组件职责：
 * - WebGL 探测：失败 → 显示 fallback 提示
 * - mount 时启动 SceneManager（持有 renderer / RAF / 场景）
 * - sr-only 焦点代理按钮组（enter craft / swing / back）
 * - 卸载时 SceneManager.dispose()
 */

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  closeDetail,
  initFromHash,
  requestEnter,
  requestExit,
  requestDetail,
  setWebglOk,
  useDetailView,
  useThreeView,
} from "@/lib/three/viewStore";
import { SceneManager } from "./SceneManager";
import { buildCraftConfig, buildSwingConfig } from "./roomConfigs";
import { DetailPopup } from "./DetailPopup";

function probeWebgl(): boolean {
  if (typeof window === "undefined") return false;
  const c = document.createElement("canvas");
  return !!(c.getContext("webgl2") || c.getContext("webgl"));
}

export function ThreeExperience() {
  const t = useTranslations("three3d");
  const tCraft = useTranslations("products.craft");
  const tSwing = useTranslations("products.swing");
  const view = useThreeView();
  const detailView = useDetailView();
  const mountRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const [webglOk, setWebglOkState] = useState(true);
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    initFromHash();
    const ok = probeWebgl();
    setWebglOkState(ok);
    setWebglOk(ok);
  }, []);

  useEffect(() => {
    if (!webglOk) return;
    if (managerRef.current) return;
    const mount = mountRef.current;
    if (!mount) return;
    const buttonLabels = {
      back: t("back"),
      switch: t("switchTo"),
      download: t("downloadCta"),
      docs: t("docsCta"),
    };
    const roomConfigs = {
      craft: buildCraftConfig({
        intro: {
          eyebrow: tCraft("intro.eyebrow"),
          headline: tCraft("intro.headline"),
          subtext: tCraft("intro.subtext"),
        },
        features: {
          item1Title: tCraft("features.item1Title"),
          item1Body: tCraft("features.item1Body"),
          item2Title: tCraft("features.item2Title"),
          item2Body: tCraft("features.item2Body"),
          item3Title: tCraft("features.item3Title"),
          item3Body: tCraft("features.item3Body"),
          item4Title: tCraft("features.item4Title"),
          item4Body: tCraft("features.item4Body"),
          item5Title: tCraft("features.item5Title"),
          item5Body: tCraft("features.item5Body"),
        },
        faq: {
          q1: tCraft("faq.q1"),
          a1: tCraft("faq.a1"),
          q2: tCraft("faq.q2"),
          a2: tCraft("faq.a2"),
          q3: tCraft("faq.q3"),
          a3: tCraft("faq.a3"),
        },
        buttonLabels,
      }),
      swing: buildSwingConfig({
        intro: {
          headline: tSwing("intro.headline"),
          subtext: tSwing("intro.subtext"),
        },
        features: {
          item1Title: tSwing("features.item1Title"),
          item1Body: tSwing("features.item1Body"),
          item2Title: tSwing("features.item2Title"),
          item2Body: tSwing("features.item2Body"),
          item3Title: tSwing("features.item3Title"),
          item3Body: tSwing("features.item3Body"),
        },
        faq: {
          q1: tSwing("faq.q1"),
          a1: tSwing("faq.a1"),
          q2: tSwing("faq.q2"),
          a2: tSwing("faq.a2"),
          q3: tSwing("faq.q3"),
          a3: tSwing("faq.a3"),
        },
        buttonLabels,
      }),
    };
    const mgr = new SceneManager({
      mount,
      labels: {
        craft: t("productCraft"),
        swing: t("productSwing"),
      },
      reduced:
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      onMarkerActivate: (room) => {
        if (room === "craft") requestEnter("craft");
        else if (room === "swing") requestEnter("swing");
      },
      // 用户 v20：双击面板触发详细 popup
      onPanelActivate: (product, idx) => requestDetail(product, idx),
      roomConfigs,
      buttonLabels,
      switchUrls: {
        craft:
          process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ||
          "https://github.com/acecrush-dev/acecrush-craft-app/releases/latest/download/acecrush-craft.apk",
        swing:
          "https://github.com/acecrush-dev/swing-analysis-app/releases/latest",
      },
    });
    managerRef.current = mgr;

    const onFirstInteract = () => {
      setHintVisible(false);
      window.removeEventListener("pointerdown", onFirstInteract);
    };
    window.addEventListener("pointerdown", onFirstInteract);

    return () => {
      window.removeEventListener("pointerdown", onFirstInteract);
      mgr.dispose();
      managerRef.current = null;
    };
  }, [webglOk, t, tCraft, tSwing]);

  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }
    };
  }, []);

  if (!webglOk) {
    return (
      <div className="three-shell three-fallback" role="alert">
        <div className="three-fallback-card">
          <h2>{t("loading")}</h2>
          <p>{t("webglFallback")}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`three-shell${detailView ? " detail-blur" : ""}`}
      role="region"
      aria-label={t("canvasAriaLabel")}
    >
      <div ref={mountRef} className="three-canvas-mount" />
      <div className="three-hud bottom-center">
        {hintVisible && view === "globe" && (
          <span className="three-hud-hint" aria-hidden="true">
            {t("enterHint")}
          </span>
        )}
      </div>
      {view !== "globe" && !detailView && (
        <div className="three-hud bottom-center-room">
          <button
            type="button"
            className="nav-btn-3d nav-btn-back"
            onClick={() => requestExit()}
            aria-label={t("back")}
          >
            {t("back")}
          </button>
        </div>
      )}
      <div className="three-flash" data-flash="idle" />
      {/* 用户 v20：双击面板触发详细 popup */}
      {detailView && (
        <DetailPopup
          product={detailView.product}
          panelIndex={detailView.panelIndex}
          onClose={() => closeDetail()}
          tCraft={tCraft}
          tSwing={tSwing}
        />
      )}
    </div>
  );
}