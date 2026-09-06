import type { Metadata, Viewport } from "next";
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
 * plan 001 §4-18（附录 A1）：站点此前完全没有 metadata 导出，
 * 意味着没有 <title>、没有 description，搜索结果与分享卡片全是空白。
 *
 * 语言说明：静态导出单 HTML，服务端固定渲染 en，故 metadata 用英文；
 * zh 用户的 <html lang> 由 LocaleLangSync 在 mount 后同步。
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://acecrush.dev"),
  title: {
    default: "AceCrush · Tennis Tech Tools",
    template: "%s · AceCrush",
  },
  description:
    "On-device tennis tools from AceCrush: AceCrush Craft for grip size, racket profiles and stringing data on Android, and Swing Analysis for automatic swing segmentation on the desktop.",
  applicationName: "AceCrush",
};

/**
 * Root layout (plan 004 v6p)。
 *
 * v6：locale 走 client-side localStorage store；server 渲染 en 默认 HTML。
 * v6c：theme init script 改 public/theme-init.js（避开 JSX <script> warning）
 * v6f：默认主题 'dark'（localStorage 无值时进 dark，不再跟 OS）
 * v6g：弃用 next/script with beforeInteractive，改为原生 <script>。
 * v6p：字体走 CDN（jsDelivr @fontsource/space-grotesk + geist）。
 * plan 001 restyle (2026-09-07)：替换为 cosmos.network 同款字体栈：
 *      - 大标题：Archivo Variable，开 wdth=125 宽体模式（wdth.css）
 *      - 正文 / 导航 / 按钮 / 卡片：Inter Variable
 *      - 等宽（数字 / 仪表盘）：JetBrains Mono Variable
 *      三包均走 @fontsource-variable，可变字体只下载一份 woff2。
 *      网络抖动或 CDN 失败时回退到 token 列表里的系统字。
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* plan 001 §4-18（附录 A11 / B8 rendering-resource-hints）：
            三个字体 CSS 都在 cdn.jsdelivr.net，preconnect 让 DNS + TLS 握手
            与 HTML 解析并行，省掉首个请求的往返延迟。 */}
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        {/* 字体栈（plan 001 restyle）：
            Archivo wdth 轴只通过 wdth.css 注册（@fontsource-variable/archivo 的
            index.css 只暴露 wght 轴，wdth.css 才把 wdth 100-125 写入 @font-feature-settings
            / font-variation-settings 默认值）。下面用 --font-display 的 wdth:125
            才会真正生效。 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fontsource-variable/archivo@5.3.0/wdth.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5.3.0/index.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fontsource-variable/jetbrains-mono@5.3.0/index.css"
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