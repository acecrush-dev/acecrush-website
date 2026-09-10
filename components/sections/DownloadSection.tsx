"use client";

import {
  AndroidLogo,
  AppleLogo,
  ArrowUpRight,
  DownloadSimple,
  Monitor,
} from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/motion/reveal";

/**
 * Download - 双产品分组（plan 001 §4-10）。
 *
 * 组 A · AceCrush Craft：Android APK 主下载 + iOS 占位。
 * 组 B · Swing Analysis：桌面端主下载（`/releases/latest` → GitHub 302 到当前最新版本页）。
 *   仅桌面端，使用 `md:grid-cols-2` 让卡片独占左列与 Craft Android 块同宽，右列留白。
 *   安装文档入口已上移到 SwingSection / BrandHero（hero 与产品区各一处），本区不再重复。
 *
 * APK 链接（plan 001 §3）：repo 现名 `acecrush-craft-app`（带横线）；
 *   站上原先的 `acecrushcraft-app` 是改名前旧 slug，仅靠 GitHub 301 苟活。
 *   asset 名 `acecrush-craft.apk` 不变，`/releases/latest/download/` 永远指向最新版。
 *   `NEXT_PUBLIC_APK_DOWNLOAD_URL` env 覆盖保留（staging 用）。
 */
const APK_FALLBACK_URL =
  "https://github.com/acecrush-dev/acecrush-craft-app/releases/latest/download/acecrush-craft.apk";
const APK_FILE_SIZE = "50 MB";
const SWING_RELEASES_URL =
  "https://github.com/acecrush-dev/swing-analysis-app/releases/latest";

export function DownloadSection() {
  const t = useTranslations("download");
  const tCraft = useTranslations("products.craft.download");
  const tSwing = useTranslations("products.swing.download");
  const apkUrl = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ?? APK_FALLBACK_URL;

  return (
    <section
      id="download"
      className="container-x py-20 lg:py-28"
      aria-labelledby="dl-heading"
    >
      <Reveal>
        <h2
          id="dl-heading"
          className="text-[32px] md:text-[44px] leading-[1.1] tracking-tight font-semibold"
        >
          {t("heading")}
        </h2>
      </Reveal>
      <Reveal delay={0.08}>
        <p
          className="mt-3 max-w-[58ch] text-[15px]"
          style={{ color: "var(--color-fg-muted)" }}
        >
          {t("subheading")}
        </p>
      </Reveal>

      {/* 组 A · Craft */}
      <div className="mt-14" aria-labelledby="dl-craft-heading">
        <Reveal>
          <h3
            id="dl-craft-heading"
            className="text-[20px] md:text-[24px] font-semibold tracking-tight"
            style={{ color: "var(--color-fg)" }}
          >
            {tCraft("productHeading")}
          </h3>
        </Reveal>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Android */}
          <Reveal className="h-full">
            <div
              className="card-elevated p-8 h-full flex flex-col gap-5"
              style={{ background: "var(--color-bg-elevated)" }}
            >
              <div className="flex items-center gap-3">
                <AndroidLogo size={32} weight="regular" aria-hidden />
                <h4 className="text-[20px] font-semibold">{tCraft("androidLabel")}</h4>
              </div>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--color-fg-muted)" }}>
                {tCraft("androidBody", { fileSize: APK_FILE_SIZE })}
              </p>
              <div className="mt-auto flex flex-col gap-2">
                <a href={apkUrl} className="btn-primary self-start justify-center" download>
                  <DownloadSimple size={18} weight="bold" aria-hidden />
                  {tCraft("androidCta")}
                </a>
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-fg-subtle)" }}>
                  {tCraft("androidNote")}
                </p>
              </div>
            </div>
          </Reveal>

          {/* iOS 占位 */}
          <Reveal delay={0.1} className="h-full">
            <div
              className="card-elevated p-8 h-full flex flex-col gap-5"
              style={{ background: "var(--color-surface)" }}
            >
              <div className="flex items-center gap-3">
                <AppleLogo size={32} weight="regular" aria-hidden />
                <h4 className="text-[20px] font-semibold">{tCraft("iosLabel")}</h4>
              </div>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--color-fg-muted)" }}>
                {tCraft("iosBody")}
              </p>
            </div>
          </Reveal>
        </div>
      </div>

      {/* 组 B · Swing Analysis：桌面端主下载单卡（无移动端） */}
      <div className="mt-14" aria-labelledby="dl-swing-heading">
        <Reveal>
          <h3
            id="dl-swing-heading"
            className="text-[20px] md:text-[24px] font-semibold tracking-tight"
            style={{ color: "var(--color-fg)" }}
          >
            {tSwing("productHeading")}
          </h3>
        </Reveal>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Reveal delay={0.1} className="h-full">
            <div
              className="card-elevated p-8 h-full flex flex-col gap-5"
              style={{ background: "var(--color-bg-elevated)" }}
            >
              <div className="flex items-center gap-3">
                <Monitor size={32} weight="regular" aria-hidden />
                <h4 className="text-[20px] font-semibold">{tSwing("desktopLabel")}</h4>
              </div>
              <p
                className="text-[14px] leading-relaxed"
                style={{ color: "var(--color-fg-muted)" }}
              >
                {tSwing("desktopBody")}
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href={SWING_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary self-start justify-center"
                >
                  <DownloadSimple size={18} weight="bold" aria-hidden />
                  {tSwing("releasesCta")}
                </a>
                <p
                  className="text-[12px] leading-relaxed"
                  style={{ color: "var(--color-fg-subtle)" }}
                >
                  {tSwing("releasesNote")}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
