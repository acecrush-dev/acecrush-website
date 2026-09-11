# AceCrush 官网

> **AceCrush 品牌站**（单页 SPA，静态导出），呈现两款产品：
> - **AceCrush Craft** · Android 端网球装备数据工具（AI 握把尺寸 / 球拍档案 / 穿线记录 / 磅数换算）
> - **Swing Analysis** · 桌面端网球挥拍自动切分（Python 后端 + Electron GUI + CLI）
>
> Next.js（App Router, RSC）+ Tailwind v4 + Motion + Phosphor Icons + **next-intl（zh-CN + en）**。
> 静态导出（`output: 'export'`），支持 **Vercel** 与 plan 003 自有 Nginx 两种部署。
>
> **plan 001 (2026-09-05)**: 单产品落地页 → 双产品品牌站；messages 重构为
> `products.craft.*` / `products.swing.*`；补 metadata / skip link / focus-visible /
> scroll-margin / color-scheme 等设计审查整改项。联系邮箱 `acecrushdev@gmail.com`。
>
> **plan 003 (2026-09-11)**: 整站 3D 沉浸式重构。raw three.js 零新依赖；
> 全屏 Hub（自转网球 + 2 个产品 marker）+ 球内产品房间（BackSide 球壳 +
> 接缝光带 + CanvasTexture 面板 + 3D mesh 按钮）；AppNav 永远在顶端；
> WebGL 不可用降级为提示卡（不切回经典页）。
> `components/three/` 模块图见下文 §架构。

## 开发

```bash
cd acecrush-website
npm install              # 需要 Node 22+
npm run dev              # http://localhost:3000（默认 en；右上角切 zh-CN，走 localStorage）
```

## 测试

```bash
npm test                 # smoke（12 组）+ store 断言 + i18n key 对齐
```

## i18n key 对齐校验（W-M4 硬校验）

```bash
node scripts/check-i18n-keys.mjs
# [OK] zh-CN ↔ en key-aligned (138 keys)
```

## 构建

```bash
npm run build
# 产物：out/（纯静态 HTML + JS + CSS）
```

构建产物可部署到：
1. **Vercel**（推荐，最快上线）
2. **自有 VPS + Nginx**（plan 003 部署栈，统一域名）

## 架构（plan 003 3D 沉浸）

```
app/page.tsx
└── components/layout/LandingContent.tsx      // 永远渲染 AppNav + <ThreeExperience/>
    ├── components/layout/AppNav.tsx          // 顶端 nav：brand + Craft/Swing/Download/FAQ + locale/theme + contact
    └── components/three/ThreeExperience.tsx  // WebGL 探测 + 启动 SceneManager
        └── components/three/SceneManager.ts  // 单 renderer/RAF/ResizeObserver + 场景切换
            ├── components/three/GlobeScene.ts       // Hub：网球 + 2 产品 marker + OrbitControls + 星尘
            └── components/three/RoomScene.ts        // 房间：BackSide 球壳 + 接缝光带 + 4 面板 + 4 按钮
                └── components/three/panelTexture.ts // CanvasTexture 工厂（drawPanel/drawButton/drawFelt）

共享：
- components/three/tennisBall.ts   // buildBallWithSeams / buildSeamRibbon / tennisSeamPoint / latLonToMarkerPos
- components/three/overlay.ts      // SVG 折线 tooltip 覆盖层
- components/three/tween.ts        // TweenGroup + 缓动函数（零依赖）
- components/three/roomConfigs.ts  // buildCraftConfig / buildSwingConfig
- lib/three/viewStore.ts           // useSyncExternalStore: view / phase / webglOk + requestEnter/Exit/initFromHash
```

降级链：WebGL 不可用 / contextlost → `webglFallback` 提示卡；`prefers-reduced-motion` 关闭自转与光带流动。

i18n 新增 `three3d.*`（16 key：modeToggle3d/Classic、enterHint、dragHintRoom、back、switchTo、downloadCta、docsCta、contactNode、loading、webglFallback、canvasAriaLabel、productCraft、productSwing、enterCraftSr、enterSwingSr；en/zh 对齐）。

## 部署到 Vercel

**采用 ainnis_web 同款纯 CLI 流程**（gitee / GitHub 都不依赖）：
- 不用绑 git 仓库
- 本地 build → 直接上传 `out/` 到 Vercel CDN
- CF DNS 自动指向 Vercel

### 一次性设置（10 分钟）

```bash
# 1. 装 Vercel CLI
npm install -g vercel

# 2. 浏览器登录（一次性）
cd ./acecrush-website
npx vercel login

# 3. 把当前目录链到 Vercel 项目（首次会问项目名；输入 acecrush-craft）
npx vercel link
# 创建 .vercel/project.json，下次 deploy 自动用

# 4. Vercel 控制台加自定义域名
#    https://vercel.com/dashboard → acecrush-craft → Settings → Domains
#    添加 acecrush.dev + www.acecrush.dev

# 5. 准备 CF API Token
#    Cloudflare 账号 → API Tokens → Create Token
#    权限模板：Edit zone DNS（Zone Resources 选 acecrush.dev）
#    复制 token + 你的 Cloudflare 邮箱
```

### 部署（每次一行命令）

```bash
cd /Users/leo/Documents/codes/ai/ace-crush-lab/website
export CF_API_KEY="<你的 cloudflare token>"
export CF_EMAIL="你的邮箱"
./scripts/deploy-vercel.sh
```

脚本流程（3 步）：
1. **CF DNS**：apex `acecrush.dev` → A 记录 `76.76.21.21`；`www.acecrush.dev` → CNAME `cname.vercel-dns.com`（幂等，可重复跑）
2. **Build**：`npm run build` → `out/`
3. **Deploy**：`npx vercel deploy --prod --yes`（用 `.vercel/project.json` 自动用已 link 的项目）

5-10 秒后 → `https://acecrush.dev` 上线。

### 跳过 DNS（已配过）

```bash
./scripts/deploy-vercel.sh --skip-dns
```

### Dry-run（不发任何请求）

```bash
DRY_RUN=1 ./scripts/deploy-vercel.sh
```

dry-run 仍会 build + Vercel deploy 试运行（用 `--yes` 时），但 CF API 调用不实际执行。

### 为什么不用 git 集成

Vercel 原生支持 GitHub / GitLab / Bitbucket，**不支持 gitee**。但 Vercel CLI 完全不依赖 git：

- `vercel deploy` 直接上传本地 `out/` 目录
- 不需要仓库绑定
- 不需要 push webhook
- 项目配置存到 `.vercel/project.json`

ainnis_web 也是 gitee 项目，部署流程就是这套。手动一行命令。

### 优缺点对比

| | Vercel CLI（ainnis 风格） | plan 003 Nginx |
|---|---|---|
| gitee 兼容 | ✅ 完全无关 git | ✅ |
| 域名 + HTTPS | 自动签 Let's Encrypt | 需手申请（certbot 容器） |
| 国内访问 | ⚠️ Vercel 海外 CDN，国内可能慢或被墙 | ✅ VPS 国内访问快 |
| 自定义 server conf | 不可（Edge Functions 限制） | ✅ 完整 nginx 配置 |
| 部署速度 | 本地 build + 上传 ~30s | push → CI → VPS 需 2-5 分钟 |
| 自动 deploy on push | ❌ 手动跑脚本 | ✅（plan 003 CI workflow） |
| 域名成本 | 0（Vercel 提供） | 域名 + VPS 月费 |

### 何时切换到 plan 003 Nginx

如果国内用户为主 + 自动 deploy 需求：
- 域名 ICP 备案后
- 切到 VPS + Nginx + Certbot
- devops/compose/docker-compose.yml 已经写好了 `website.conf` server 块 + 静态卷挂载
- 只需把 `out/` 拷贝到 VPS 的 `/var/www/website/` 即可

## 本地预览构建产物

```bash
npm run serve            # npx serve out
# 或：
python3 -m http.server -d out 8080
```

## 设计

设计规范与 Pre-Flight 自查见：

- [`TODO-assets.md`](./TODO-assets.md) - 真实素材占位登记（用户后续替换）

审查基线（`.claude/skills/`）：`web-design-guidelines`（Vercel Web Interface Guidelines）
与 `vercel-react-best-practices`。plan 001 的整改项见 `plans/001-two-product-spa-landing.md` 附录 A / B。

## 文案

所有可见文案集中在 [`messages/en.json`](./messages/en.json) 与
[`messages/zh-CN.json`](./messages/zh-CN.json)，两份 key 必须 100% 对齐
（`npm test` 会硬校验）。组件里禁止硬编码可见文案，一律走 `useTranslations`。

命名空间结构：

```
site / nav / theme / brandHero          共享
products.craft.*                        Craft 产品区全部文案
products.swing.*                        Swing Analysis 产品区全部文案
download / faq                          双产品共享区标题
footer / notFound / privacy             其余
```

## 部署到 plan 003 Nginx

详见 [plan 003 runbook §3.5](../devops/docs/runbook.md) - 域名解析、证书申请、nginx 静态卷挂载。

## 关键文件

```
acecrush-website/
├── app/
│   ├── layout.tsx            # 根布局 + metadata（title/description/preconnect）+ Viewport themeColor
│   ├── globals.css           # Tailwind v4 + 设计令牌（双主题）+ focus-visible / skip-link / scroll-margin
│   ├── page.tsx              # 首页 = <LandingContent />
│   └── not-found.tsx         # 404（走 i18n notFound.*）
├── components/
│   ├── layout/
│   │   ├── AppNav.tsx        # sticky nav，移动端 details/summary 折叠（Esc / 外点 / 点链接关闭）
│   │   ├── AppFooter.tsx     # id="contact"，mailto 联系入口
│   │   ├── LandingContent.tsx# skip link + 分区组装
│   │   ├── LocaleSwitcher.tsx# en / zh-CN 分段按钮（<button aria-pressed>）
│   │   └── ThemeSwitcher.tsx # light / system / dark 三态
│   ├── sections/
│   │   ├── BrandHero.tsx     # 品牌 h1 + 两张产品简介卡
│   │   ├── CraftHero.tsx     # id="craft"，产品头 + 手机框真渲染预览
│   │   ├── HowItWorks.tsx    # Craft 三步错位卡
│   │   ├── FeaturesBento.tsx # Craft 6 项不对称 bento
│   │   ├── PrivacyStrip.tsx  # Craft 隐私强调段
│   │   ├── SwingSection.tsx  # id="swing"，产品头 + 4 张特性卡
│   │   ├── FeatureCard.tsx   # Bento 与 Swing 共用的特性卡
│   │   ├── DownloadSection.tsx # id="download"，双产品分组
│   │   └── FaqSection.tsx    # id="faq"，双产品分组手风琴
│   ├── brand/BrandLogo.tsx
│   └── motion/reveal.tsx     # Motion 隔离岛（honour reduced-motion）
├── lib/
│   ├── i18n/                 # localStorage locale store + Provider
│   └── theme/                # 三态主题 Provider
├── messages/                 # en.json / zh-CN.json（唯一文案来源）
├── public/theme-init.js      # 防 FOUC inline 主题脚本（只切 .dark class）
├── scripts/                  # smoke / test-store / check-i18n-keys / deploy-vercel
├── vercel.json
├── TODO-assets.md
└── README.md
```
