"use client";

/**
 * DetailPopup - 双击面板后弹出的详细模式 popup（plan 003 + 用户 v20）。
 *
 * 用户 v20：双击每个面 → popup 展示该板块全部内容和图，左翻/右翻前后页。
 * 立体变平面：完整内容用 HTML 渲染，左右按钮翻页。
 *
 * 用户 v41：之前 CRAFT_PANELS / SWING_PANELS 是硬编码英文，用户切到中文后 popup 仍是英文。
 * 现在全部走 i18n translators（tCraft / tSwing），从 products.craft.* / products.swing.*
 * 取数；面板只放图+短标题，详细内容（含 FAQ）都从 popup 展示。
 *
 * 内容来源：
 *   - craft 房间 7 面：intro + 5 features + faq
 *   - swing 房间 5 面：intro + 3 features + faq
 *   - 用户 v82：每页配子项目 docs 截图（public/img/{craft,swing}/ 与
 *     acecrush-craft app/docs、swing-analysis docs 的 public/images 同源），
 *     配图高度受限 + 居中展示（见 globals.css .detail-popup-image）
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { navDetail, useDetailView } from "@/lib/three/viewStore";

type Props = {
  product: "craft" | "swing";
  panelIndex: number;
  onClose: () => void;
  // 透传 i18n translators（避免 popup 内部重复 useTranslations 干扰）
  tCraft: ReturnType<typeof useTranslations>;
  tSwing: ReturnType<typeof useTranslations>;
};

type PanelContent = {
  eyebrow?: string;
  title: string;
  body?: string;
  image?: string;
  imageLabel?: string;
  qaList?: { q: string; a: string }[];
};

/** 用户 v41：从 i18n 构建 craft 详细面板（intro + 5 features + faq） */
/** 用户 v44：popup 必须有文字不能只有图 → 每页都有 title + body 文字。
 *   用户 v82：参考 acecrush-craft app/docs 给每页配 docs 截图（高度受限、居中展示）。 */
function buildCraftPanels(t: ReturnType<typeof useTranslations>): PanelContent[] {
  return [
    {
      eyebrow: t("name"),
      title: t("intro.headline"),
      body: t("intro.subtext"),
      image: "/img/craft/main_page.jpg",
      imageLabel: t("intro.homeLabel"),
    },
    {
      title: t("features.item1Title"),
      body: t("features.item1Body"),
      image: "/img/craft/measurement_result.jpg",
      imageLabel: t("intro.previewLabel"),
    },
    {
      title: t("features.item2Title"),
      body: t("features.item2Body"),
      image: "/img/craft/grip_measurement_manual.jpg",
      imageLabel: t("features.item2Image"),
    },
    {
      title: t("features.item3Title"),
      body: t("features.item3Body"),
      image: "/img/craft/racquet_list.jpg",
      imageLabel: t("features.item3Image"),
    },
    {
      title: t("features.item4Title"),
      body: t("features.item4Body"),
      image: "/img/craft/string_job.jpg",
      imageLabel: t("features.item4Image"),
    },
    {
      title: t("features.item5Title"),
      body: t("features.item5Body"),
      image: "/img/craft/dt_rt.jpg",
      imageLabel: t("features.item5Image"),
    },
    {
      title: t("faq.heading"),
      qaList: [
        { q: t("faq.q1"), a: t("faq.a1") },
        { q: t("faq.q2"), a: t("faq.a2") },
        { q: t("faq.q3"), a: t("faq.a3") },
        { q: t("faq.q4"), a: t("faq.a4") },
      ],
    },
  ];
}

/** 用户 v41：从 i18n 构建 swing 详细面板（intro + 3 features + faq） */
/** 用户 v44：popup 必须有文字不能只有图 → 每页都有 title + body 文字。
 *   用户 v82：参考 swing-analysis docs 给每页配 docs 截图（docs 仅 2 张图，
 *   load_video = 主窗口加载视频 + 片段条，clip_play = 片段播放 + 骨架叠加）。 */
function buildSwingPanels(t: ReturnType<typeof useTranslations>): PanelContent[] {
  return [
    {
      eyebrow: t("name"),
      title: t("intro.headline"),
      body: t("intro.subtext"),
      image: "/img/swing/load_video.png",
      imageLabel: t("intro.homeLabel"),
    },
    {
      title: t("features.item1Title"),
      body: t("features.item1Body"),
      image: "/img/swing/clip_play.png",
      imageLabel: t("intro.previewLabel"),
    },
    {
      title: t("features.item2Title"),
      body: t("features.item2Body"),
      image: "/img/swing/load_video.png",
      imageLabel: t("features.item2Image"),
    },
    {
      title: t("features.item3Title"),
      body: t("features.item3Body"),
      image: "/img/swing/clip_play.png",
      imageLabel: t("features.item3Image"),
    },
    {
      title: t("faq.heading"),
      qaList: [
        { q: t("faq.q1"), a: t("faq.a1") },
        { q: t("faq.q2"), a: t("faq.a2") },
        { q: t("faq.q3"), a: t("faq.a3") },
        { q: t("faq.q4"), a: t("faq.a4") },
      ],
    },
  ];
}

export function DetailPopup({ product, panelIndex, onClose, tCraft, tSwing }: Props) {
  const t = useTranslations("three3d");
  const detailView = useDetailView();
  const [renderedIndex, setRenderedIndex] = useState(panelIndex);
  const [flipDir, setFlipDir] = useState<"next" | "prev" | null>(null);
  /** 用户 v36: 控制入场动画仅在挂载时跑一次（不随 flipDir 复位重新触发） */
  const [mounted, setMounted] = useState(false);
  const prevIndexRef = useRef(panelIndex);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 同步外部 panelIndex 变化（用户可能通过 store 改变）+ 触发翻页动画
  useEffect(() => {
    const prev = prevIndexRef.current;
    if (panelIndex !== prev) {
      setFlipDir(panelIndex > prev ? "next" : "prev");
      prevIndexRef.current = panelIndex;
      // 动画结束后清除 class
      const tid = setTimeout(() => setFlipDir(null), 360);
      setRenderedIndex(panelIndex);
      return () => clearTimeout(tid);
    }
    setRenderedIndex(panelIndex);
  }, [panelIndex]);

  // 用户 v41：从 i18n translators 构建议题面板数组（不再使用硬编码英文数组）
  const panels = product === "craft" ? buildCraftPanels(tCraft) : buildSwingPanels(tSwing);
  const total = panels.length;
  // 循环索引（超出范围就 wrap）
  const safeIndex = ((renderedIndex % total) + total) % total;
  const panel = panels[safeIndex];
  const isFirst = safeIndex === 0;
  const isFAQ = panel.qaList != null;

  // i18n：popup 内容全部走 tCraft / tSwing（locale 切换时内容跟随）
  const productName = product === "craft" ? tCraft("name") : tSwing("name");
  const eyebrow = panel.eyebrow || productName;
  const title = panel.title;
  const body = panel.body || "";
  const qaList = panel.qaList || [];

  function handlePrev() {
    navDetail(-1);
  }
  function handleNext() {
    navDetail(1);
  }

  // Esc 关闭 + 方向键翻页
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 用户 v23：触摸滑动翻页（移动端）
  // 用户 v38：桌面鼠标拖拽翻页（左右滑动 popup 内容翻页），共享同一套 ref/判定
  const dragStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  // 鼠标拖拽后，标志是否刚发生过 drag：防止 drag 后的 click 事件被误判为「点击空白处」
  const draggedRef = useRef(false);

  // 用户 v38：判定是否触发翻页；返回 true 表示这是一次有效 drag。
  function tryFlip(x0: number, y0: number, t0: number, x1: number, y1: number, t1: number) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dt = t1 - t0;
    // 横向位移 > 50px 且明显横>纵（避免上下滚动触发误翻页）且 800ms 内
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 2 && dt < 800) {
      if (dx > 0) handlePrev();
      else handleNext();
      return true;
    }
    return false;
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    dragStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start || e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    if (tryFlip(start.x, start.y, start.t, t.clientX, t.clientY, Date.now())) {
      draggedRef.current = true;
    }
  };
  const onPointerDown = (e: React.PointerEvent) => {
    // 仅响应鼠标/手写笔（touch 由 onTouchStart 接管，避免重复触发）
    if (e.pointerType === "touch") return;
    // 仅主键（左键）
    if (e.button !== 0) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    // 注意：v48 不再 setPointerCapture（它会把后续 click 也派发到 overlay，
    // 导致点击 prev/next/close btn 时被误判成「点击 overlay」而关掉 popup）。
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start) return;
    if (tryFlip(start.x, start.y, start.t, e.clientX, e.clientY, Date.now())) {
      // drag 翻页后，标记：避免后续 click 被当成「点击空白处」而误关 popup
      draggedRef.current = true;
    }
  };

  // 用户 v38：传入给 portal，drag 后跳过 click-outside 关闭
  // 用户 v48：明确「空白区域」= overlay 自身（不包含 content / nav / close btn）。
  //   用 closest() 反向排除：若事件源在 content/nav/close 里就不关。
  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    const t = e.target as Element | null;
    if (t && typeof t.closest === "function") {
      if (
        t.closest(".detail-popup-content") ||
        t.closest(".detail-popup-nav") ||
        t.closest(".detail-popup-close")
      ) {
        return;
      }
    }
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <DetailPopupPortal
      productName={productName}
      title={title}
      body={body}
      panel={panel}
      isFAQ={isFAQ}
      qaList={qaList}
      safeIndex={safeIndex}
      total={total}
      eyebrow={eyebrow}
      flipDir={flipDir}
      mounted={mounted}
      onClose={onClose}
      onPrev={handlePrev}
      onNext={handleNext}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onOverlayClick={onOverlayClick}
    />
  );
}

type PortalProps = {
  productName: string;
  title: string;
  body: string;
  panel: PanelContent;
  isFAQ: boolean;
  qaList: { q: string; a: string }[];
  safeIndex: number;
  total: number;
  eyebrow: string;
  flipDir: "next" | "prev" | null;
  mounted: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  // 用户 v38: 桌面鼠标拖拽翻页（共享 touch 判定）
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  // 用户 v38: drag 后跳过 click-outside 关闭（与 v37 共用 handler 内部逻辑）
  onOverlayClick: (e: React.MouseEvent<HTMLDivElement>) => void;
};

function DetailPopupPortal(props: PortalProps) {
  const {
    productName, title, body, panel, isFAQ, qaList, safeIndex, total, eyebrow, flipDir, mounted,
    onClose, onPrev, onNext, onTouchStart, onTouchEnd, onPointerDown, onPointerUp, onOverlayClick,
  } = props;
  const node = (
    <div
      className="detail-popup-overlay"
      onClick={onOverlayClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} - ${title}`}
    >
      <button
        type="button"
        className="detail-popup-close"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      <button
        type="button"
        className="detail-popup-nav detail-popup-prev"
        onClick={onPrev}
        aria-label="Previous"
        disabled={false}
      >
        ‹
      </button>
      <button
        type="button"
        className="detail-popup-nav detail-popup-next"
        onClick={onNext}
        aria-label="Next"
      >
        ›
      </button>
      <div
        className={`detail-popup-content${
          flipDir === "next"
            ? " flip-next"
            : flipDir === "prev"
              ? " flip-prev"
              : mounted
                ? " mounted"
                : ""
        }`}
      >
        <div className="detail-popup-eyebrow">{eyebrow}</div>
        <h1 className="detail-popup-title">
          {title.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < title.split("\n").length - 1 && <br />}
            </span>
          ))}
        </h1>
        {body && <p className="detail-popup-body">{body}</p>}
        {panel.image && (
          <figure className="detail-popup-figure">
            <img
              src={panel.image}
              alt={panel.imageLabel || title}
              loading="lazy"
              className="detail-popup-image"
            />
            {panel.imageLabel && (
              <figcaption className="detail-popup-caption">
                {panel.imageLabel}
              </figcaption>
            )}
          </figure>
        )}
        {isFAQ && (
          <div className="detail-popup-qa">
            {qaList.map((qa, i) => (
              <div key={i} className="detail-popup-qa-item">
                <h3 className="detail-popup-qa-q">{qa.q}</h3>
                <p className="detail-popup-qa-a">{qa.a}</p>
              </div>
            ))}
          </div>
        )}
        <div className="detail-popup-pager">
          {safeIndex + 1} / {total}
        </div>
      </div>
    </div>
  );

  // SSR 安全：只在客户端挂载后用 portal 渲染到 body（避免被 .three-shell.detail-blur 模糊）
  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}