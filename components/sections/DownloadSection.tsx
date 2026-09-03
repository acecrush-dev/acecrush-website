"use client";

import { AndroidLogo, AppleLogo, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/motion/reveal";

/**
 * Download - 2 列：左 APK 主 CTA，右 iOS 占位。
 * v6o：删除国内应用市场四厂商块（Huawei/Xiaomi/OPPO/vivo + 「上架准备中」），
 *   用户明确去掉该模块；iOS 卡片只剩 AppleLogo + 文案。
 * v6u：APK 走 Vercel 静态托管（已废弃；plan 011 改走 GitHub Releases）。
 * plan 011：APK 走 GitHub Releases。下载链接默认
 *   `https://github.com/acecrush-dev/acecrushcraft-app/releases/latest/download/acecrush-craft.apk`——
 *   `app/scripts/release-apk.sh` build + 上传（`gh release create`），`/releases/latest/`
 *   永远指向最新版本，前端代码零改动。env var 仍可覆盖用于 staging。
 */
export function DownloadSection() {
  const t = useTranslations("download");
  const apkUrl =
    process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ??
    "https://github.com/acecrush-dev/acecrushcraft-app/releases/latest/download/acecrush-craft.apk";
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

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {/* Android */}
        <Reveal className="h-full">
          <div
            className="card-elevated p-8 h-full flex flex-col gap-5"
            style={{ background: "var(--color-bg-elevated)" }}
          >
            <div className="flex items-center gap-3">
              <AndroidLogo size={32} weight="regular" />
              <div className="text-[20px] font-semibold">{t("androidLabel")}</div>
            </div>
            <p className="text-[14px]" style={{ color: "var(--color-fg-muted)" }}>
              {t("androidBody", { fileSize: "35 MB" })}
            </p>
            <div className="mt-auto flex flex-col gap-2">
              <a
                href={apkUrl}
                className="btn-primary justify-center"
                download
              >
                <DownloadSimple size={18} weight="bold" />
                {t("androidCta")}
              </a>
              <p className="text-[12px]" style={{ color: "var(--color-fg-subtle)" }}>
                {t("androidNote")}
              </p>
            </div>
          </div>
        </Reveal>

        {/* iOS 占位（v6o 去掉原 markets 块） */}
        <Reveal delay={0.1} className="h-full">
          <div
            className="card-elevated p-8 h-full flex flex-col gap-5"
            style={{ background: "var(--color-surface)" }}
          >
            <div className="flex items-center gap-3">
              <AppleLogo size={32} weight="regular" />
              <div className="text-[20px] font-semibold">{t("iosLabel")}</div>
            </div>
            <p className="text-[14px]" style={{ color: "var(--color-fg-muted)" }}>
              {t("iosBody")}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}