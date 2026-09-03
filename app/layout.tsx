import type { Viewport } from "next";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF6" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1410" },
  ],
};

/**
 * Root layout (plan 004 v6p)。
 *
 * v6：locale 走 client-side localStorage store；server 渲染 en 默认 HTML。
 * v6c：theme init script 改 public/theme-init.js（避开 JSX <script> warning）
 * v6f：默认主题 'dark'（localStorage 无值时进 dark，不再跟 OS）
 * v6g：弃用 next/script with beforeInteractive，改为原生 <script>。
 * v6p：字体走 CDN（jsDelivr @fontsource/space-grotesk + geist），
 *      国内网络 jsDelivr 偶有抖动；CSS font-family 列表已设完整 fallback
 *      到系统字体（PingFang SC / Alibaba PuHuiTi / Microsoft YaHei），
 *      CDN 失败时自动回退系统原生字。
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* v6p：字体栈 - 大标题 Space Grotesk + 正文 Geist Sans/Mono */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fontsource/space-grotesk@5.1.0/index.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/geist@1.4.0/dist/fonts/geist-sans/geist-sans.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/geist@1.4.0/dist/fonts/geist-mono/geist-mono.css"
        />
        <script src="/theme-init.js" />
      </head>
      <body className="min-h-[100dvh] antialiased">
        <I18nProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}