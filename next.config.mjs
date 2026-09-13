import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// 用户 v61：allowedDevOrigins 用环境变量配置（IP 是动态的，局域网不固定）
//   - 默认值保留 v60 硬编码列表（本地兼容）
//   - 用户可设 NEXT_PUBLIC_DEV_ORIGINS=192.168.7.213,10.0.0.5 覆盖
//   - 多个 origin 用英文逗号分隔
const DEFAULT_DEV_ORIGINS = ["localhost", "127.0.0.1", "0.0.0.0"];
const envOrigins = (process.env.NEXT_PUBLIC_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowedDevOrigins = [
  ...DEFAULT_DEV_ORIGINS,
  ...envOrigins,
];

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
  // 全部 403 + HMR WebSocket 拒连。
  // 用户 v61：改成 env 配置（NEXT_PUBLIC_DEV_ORIGINS=ip1,ip2,...），
  //   默认列表仍含 127.0.0.1 / 0.0.0.0 / localhost
  allowedDevOrigins,
};

export default withNextIntl(nextConfig);