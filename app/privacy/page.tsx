"use client";

import { useTranslations } from "next-intl";
import { PrivacyContent } from "@/components/layout/PrivacyContent";

/**
 * /privacy - 隐私政策页（用户 2026-09-16 恢复路由）。
 *
 * 与 /terms 共享 PrivacyContent 法务壳；section 文案全部来自 messages.{locale}.privacy.*。
 * locale 由 client i18n store 控制（无 [locale] 段）。
 */
export default function PrivacyPage() {
  const t = useTranslations("privacy");
  return (
    <PrivacyContent
      title={t("title")}
      effective={t("effective")}
      sections={[
        { title: t("section1Title"), body: t("section1Body") },
        { title: t("section2Title"), body: t("section2Body") },
        {
          title: t("section3Title"),
          list: [t("section3Camera"), t("section3Notification")],
        },
        { title: t("section4Title"), body: t("section4Body") },
        { title: t("section5Title"), body: t("section5Body") },
        { title: t("section6Title"), body: t("section6Body") },
      ]}
    />
  );
}
