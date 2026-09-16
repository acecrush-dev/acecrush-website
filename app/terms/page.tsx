"use client";

import { useTranslations } from "next-intl";
import { PrivacyContent } from "@/components/layout/PrivacyContent";

/**
 * /terms - 服务条款页（用户 2026-09-16 新增路由）。
 *
 * 复用 PrivacyContent 法务壳；section 文案全部来自 messages.{locale}.terms.*。
 * locale 由 client i18n store 控制（无 [locale] 段）。
 */
export default function TermsPage() {
  const t = useTranslations("terms");
  return (
    <PrivacyContent
      title={t("title")}
      effective={t("effective")}
      sections={[
        { title: t("section1Title"), body: t("section1Body") },
        { title: t("section2Title"), body: t("section2Body") },
        { title: t("section3Title"), body: t("section3Body") },
        { title: t("section4Title"), body: t("section4Body") },
        { title: t("section5Title"), body: t("section5Body") },
        { title: t("section6Title"), body: t("section6Body") },
      ]}
    />
  );
}
