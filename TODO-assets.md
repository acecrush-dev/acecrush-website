# 真实资产占位清单（plan 004 v4 §3 + §4.8）

所有占位资产集中登记在这里。用户后续提供真实素材后逐项替换。

## Logo / 品牌

- [ ] **logo.png / logo.svg**（256×256,深色与浅色两版）— 当前用 Phosphor TennisBall + 字标兜底
- [ ] **favicon.ico**（32×32）— 当前用 favicon 缺省
- [ ] **OG 分享图 1200×630**（zh-CN + en 两版）— 当前 OG 图缺省,社交分享时显示空白

## 应用商店 / 上架

- [ ] **APK 真文件**：见 `public/apk/README.md`
- [ ] **App Store 图**：1024×1024 + 6.7"/6.1"/5.5"/12.9" 各套截图
- [ ] **TestFlight 邀请链接** — iOS 上线后填入 download.ios.cta
- [ ] **华为 / 小米 / OPPO / vivo 应用市场上架链接** — 上架后填入 download.markets

## 产品截图（Hero 右侧手机框可替换）

- [ ] **真手机框套图** — 用真机截图替换现在 React 组件预览（更可信）
- [ ] **测量场景照** — A4 + 手掌 顶拍实拍，4:3 或 16:9

## 视觉素材

- [ ] **球场氛围照** — Hero 背景 / Privacy Strip 背景可选，picsum 占位临时用

## 备案与法务

- [x] **域名** — ✅ `acecrush.dev`（Cloudflare 管理）；DNS 由 `scripts/deploy-vercel.sh` 自动指向 Vercel（76.76.21.21）
- [ ] ~~ICP 备案号~~ — **移除（用户决定不在国内部署，2026-08-23）**：footer 中 ICP 段已删；nginx.conf 中的 certbot 块可保留（HTTPS 仍需要，与 ICP 无关）
- [ ] **隐私政策 URL（公网 https://）** — App Store 提交必填（zh-CN：`/privacy/`；en：`/en/privacy/`）

## 联系方式

- [ ] **真实邮箱** — 当前用 `hi@acecrush.dev` 占位（域名已确定；邮箱待用户绑定）

## 多语言（plan 004 v4 新增）

- [x] **zh-CN 文案** — ✅ `messages/zh-CN.json`
- [x] **en 文案** — ✅ `messages/en.json`（机翻兜底 + 关键 key 手工校对）
- [ ] **en 文案母语审校** — 长文本（FAQ a3-a6 / privacy section 4-6）建议网球爱好者母语者过一遍
- [ ] **en OG 图 / favicon** — 与 zh-CN 区分或共用一套，看用户偏好

## 主题切换（plan 004 v4 新增）

- [x] **科技绿 token** — ✅ light #008F4D / dark #00FF8A（ainnis_app 来源，固定不再变）
- [x] **三态主题切换器** — ✅ light/dark/system + localStorage + 防闪烁 inline script
- [ ] **WCAG AA 对比度实测** — `#00FF8A` on `#0F1A12` 验一下：实测 ≥4.5:1（按钮文字）/ ≥3:1（大字）；不达标时降饱和度变体 `#00E07A` 并更新 token

## 已确认不需要

- 第 3 种语言（仅 zh + en）
- 用户账号系统（V1.0 无账号）
- 在线支付（永久搁置）
- 博客 / CMS（V1.0 静态站）
