import { LandingContent } from "@/components/layout/LandingContent";

/**
 * 落地页（plan 004 v6）。
 * 无 [locale] 段；locale 由 client-side I18nProvider 通过 localStorage 提供。
 * 服务端静态导出时使用默认 en；用户切到 zh-CN 后整树 rerender。
 */
export default function HomePage() {
  return <LandingContent />;
}