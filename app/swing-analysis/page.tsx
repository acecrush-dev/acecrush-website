import { SwingPageContent } from "@/components/layout/SwingPageContent";

/**
 * /swing-analysis/ - Swing Analysis 独立路由（2026-09-18 双产品拆路由后）。
 *
 * 路由名沿用「swing-analysis」而不是「swing」：
 *   - 与 GitHub repo `swing-analysis-app`、文档站 swing-analysis-docs.acecrush.dev
 *     命名空间对齐
 *   - 跟产品 APK 命名空间一致（用户引用产品时更直观）
 *   - 跟已有 external docs URL `https://swing-analysis-docs.acecrush.dev/` 同步
 *
 * 静态导出：`output:'export' + trailingSlash:true` → out/swing-analysis/index.html
 */
export default function SwingPage() {
  return <SwingPageContent />;
}
