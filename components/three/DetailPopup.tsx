"use client";

/**
 * DetailPopup - 双击面板后弹出的详细模式 popup（plan 003 + 用户 v20）。
 *
 * 用户 v20：双击每个面 → popup 展示该板块全部内容和图，左翻/右翻前后页。
 * 立体变平面：完整内容用 HTML 渲染，左右按钮翻页。
 *
 * 内容来源：
 *   - craft 房间 7 面：intro + 5 features + faq
 *   - swing 房间 5 面：intro + 3 features + faq
 *   - intro 第一面：含 preview 图片（craft / img/craft/measurement_result.jpg,
 *     swing /img/swing/clip_play.png）
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

const CRAFT_PANELS: PanelContent[] = [
  {
    eyebrow: "AceCrush Craft",
    title: "Perfect Photo,\nPerfect Grip",
    body:
      "On-device AI measures hand size via an A4 reference, recommends your optimal grip, and tracks your next string job.",
    image: "/img/craft/measurement_result.jpg",
    imageLabel: "Measurement result preview",
  },
  {
    title: "AI grip size measurement",
    body:
      "On-device MediaPipe inference maps your palm to Yonex, Wilson and Head-Prince-Babolat sizing standards.",
  },
  {
    title: "Manual calc + grip wrap offset",
    body:
      "Enter palm length and ring finger length to get a recommended size and a wrap-driven adjustment.",
  },
  {
    title: "Racket profiles",
    body:
      "Log multiple rackets with specs and notes. Stored locally in SQLite, backup whenever you want.",
  },
  {
    title: "Restring log + expiry alerts",
    body:
      "Default restring cycles per material (polyester, multifilament, natural gut). Local notification when due.",
  },
  {
    title: "Tension conversion",
    body:
      "Convert DT, RT, lbs and kg in one place, then tap once to write the result straight into a restring record.",
  },
  {
    title: "FAQ",
    qaList: [
      {
        q: "How accurate is the AI measurement?",
        a: "We return a recommended size plus or minus one adjacent size with a confidence hint. Manual adjust is always available.",
      },
      {
        q: "Do I have to use A4 paper?",
        a: "We strongly recommend it. A4 is a reference of known size used to convert pixels to centimeters with one consistent ratio.",
      },
      {
        q: "What if my photo is taken at an angle?",
        a: "Try to shoot straight down. If the angle is off, the confidence drops to medium and we suggest manual entry.",
      },
      {
        q: "Can I skip the camera and measure manually?",
        a: "Yes. Manual entry accepts palm length and ring finger length without needing a photo at all.",
      },
    ],
  },
];

const SWING_PANELS: PanelContent[] = [
  {
    eyebrow: "Swing Analysis",
    title: "Every swing, cut and timecoded.",
    body:
      "Feed in a match video. The two-pass pipeline tracks a single right-wrist signal, segments every swing, and labels each one.",
    image: "/img/swing/clip_play.png",
    imageLabel: "Clip playback preview",
  },
  {
    title: "Two-pass swing segmentation",
    body:
      "Reads one right-wrist signal to find swing boundaries, then re-renders each clip with refined timestamps and labels.",
  },
  {
    title: "Streaming results in pass 1",
    body:
      "Segments appear while pass 1 is still running, so you can start reviewing before the full video finishes processing.",
  },
  {
    title: "Skeleton and bbox overlays",
    body:
      "Want to see the body lines on each clip? Two passes to choose from. Fast pass paints the skeleton inline; polish pass re-renders each clip afterward with steadier person boxes and smoother skeleton lines.",
  },
  {
    title: "FAQ",
    qaList: [
      {
        q: "Does my video get uploaded anywhere?",
        a: "No. Everything runs on your own machine. The local service binds to 127.0.0.1 only.",
      },
      {
        q: "How does it decide where a swing starts?",
        a: "The pipeline uses a single right-wrist signal tracked by MediaPipe pose, plus a swing-window classifier.",
      },
      {
        q: "Do I need a GPU?",
        a: "No. It runs on CPU. The skeleton overlay is the heaviest step but still well within modern laptop performance.",
      },
      {
        q: "Can I use it without the desktop GUI?",
        a: "Yes. The CLI drives the same pipeline, and the local REST plus WebSocket servers expose hooks for scripting.",
      },
    ],
  },
];

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

  const panels = product === "craft" ? CRAFT_PANELS : SWING_PANELS;
  const total = panels.length;
  // 循环索引（超出范围就 wrap）
  const safeIndex = ((renderedIndex % total) + total) % total;
  const panel = panels[safeIndex];
  const isFirst = safeIndex === 0;
  const isFAQ = panel.qaList != null;

  // 优先使用 i18n key 翻译（用户 locale 切换时内容跟随）
  // 这里因为 panelContent 是硬编码的英文，作为 fallback；理想是用 messages 文件
  // 但为了 v20 快速 ship，先用硬编码 + i18n fallback for some keys
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
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.t;
    // 横向滑动 > 50px 且 |dx| > |dy| * 2 且 < 800ms
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 2 && dt < 800) {
      if (dx > 0) handlePrev();
      else handleNext();
    }
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
};

function DetailPopupPortal(props: PortalProps) {
  const {
    productName, title, body, panel, isFAQ, qaList, safeIndex, total, eyebrow, flipDir, mounted,
    onClose, onPrev, onNext, onTouchStart, onTouchEnd,
  } = props;
  const node = (
    <div
      className="detail-popup-overlay"
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