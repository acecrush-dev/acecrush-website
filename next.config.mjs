import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",         // 静态导出
  trailingSlash: true,      // 利于 nginx 直接 serve
  images: { unoptimized: true }, // 静态导出不支持 image opt
  reactStrictMode: true,
  // 国内网络现实：不要 Google Fonts 外链（§4.1 + 中国网络）
  // 字体走 next/font local + 系统 CJK 栈
  //
  // v6c：恢复 next-intl server plugin + i18n/request.ts（最小化：locale='en' + en messages），
  // 仅为了让 server component 里的 getTranslations 不抛 "Couldn't find next-intl config"。
  // Locale 切换完全 client-side；server 渲染用 en 默认。
  //
  // v6j：Next.js 16 默认 allowedDevOrigins 只放行 `localhost`，用 `127.0.0.1`
  // / `0.0.0.0` / 局域网 IP 访问会被 dev server 当作跨源拒绝 → _next/static/chunks
  // 全部 403 + HMR WebSocket 拒连。显式把 127.0.0.1 / 0.0.0.0 加入白名单（不影响生产）。
  allowedDevOrigins: ["localhost", "127.0.0.1", "0.0.0.0"],
};

export default withNextIntl(nextConfig);