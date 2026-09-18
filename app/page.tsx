import { HomeContent } from "@/components/layout/HomeContent";

/**
 * 首页（plan 004 v6 + 2026-09-18 双产品拆路由）。
 * 无 [locale] 段；locale 由 client-side I18nProvider 通过 localStorage 提供。
 * 服务端静态导出时使用默认 en；用户切到 zh-CN 后整树 rerender。
 *
 * 2026-09-18：双产品拆为独立路由（/craft/、/swing-analysis/），
 * 首页只保留品牌 h1 + 3D 中心 + 两张产品卡，引导用户进入对应产品页。
 */
export default function HomePage() {
  return <HomeContent />;
}