import { CraftPageContent } from "@/components/layout/CraftPageContent";

/**
 * /craft/ - AceCrush Craft 独立路由（2026-09-18 双产品拆路由后）。
 *
 * 静态导出：next.config.mjs `output:'export' + trailingSlash:true`
 * → 产物为 out/craft/index.html；trailingSlash 让 nginx 直接 serve 而不 301。
 */
export default function CraftPage() {
  return <CraftPageContent />;
}
