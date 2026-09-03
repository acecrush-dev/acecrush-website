import { AppNav } from "@/components/layout/AppNav";
import { AppFooter } from "@/components/layout/AppFooter";
import { HeroSection } from "@/components/sections/HeroSection";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { FeaturesBento } from "@/components/sections/FeaturesBento";
import { PrivacyStrip } from "@/components/sections/PrivacyStrip";
import { DownloadSection } from "@/components/sections/DownloadSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { LocaleLangSync } from "@/components/i18n/LocaleLangSync";

/**
 * LandingContent（plan 004 v6）。
 *
 * 落地页 6 section + Nav + Footer；locale 由根 layout 的 I18nProvider 提供。
 * 内嵌 LocaleLangSync：mount 后把 <html lang> 同步到当前 locale。
 */
export function LandingContent() {
  return (
    <>
      <LocaleLangSync />
      <AppNav />
      <main className="px-4 md:px-6">
        <HeroSection />
        <HowItWorks />
        <FeaturesBento />
        <PrivacyStrip />
        <DownloadSection />
        <FaqSection />
      </main>
      <AppFooter />
    </>
  );
}