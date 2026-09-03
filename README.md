# AceCrush Craft 官网

> Next.js（App Router, RSC）+ Tailwind v4 + Motion + Phosphor Icons + **next-intl（zh-CN + en）**。
> 静态导出（`output: 'export'`），支持 **Vercel** 与 plan 003 自有 Nginx 两种部署。
>
> **v4 (2026-08-22)**: 科技绿 accent（dark `#00FF8A` / light `#008F4D`，来自 ainnis_app）+ 显式三态主题切换（light/dark/system + localStorage + 防闪烁）+ 双 locale i18n（next-intl middleware）。

## 开发

```bash
cd website
npm install              # 需要 Node 22+；v4 依赖 next-intl
npm run dev              # http://localhost:3000  （默认 zh-CN；/en 走英文）
```

## i18n key 对齐校验（W-M4 硬校验）

```bash
node scripts/check-i18n-keys.mjs
# [OK] zh-CN ↔ en key-aligned (100 keys)
```

## 构建

```bash
npm run build
# 产物：out/（纯静态 HTML + JS + CSS）
```

构建产物可部署到：
1. **Vercel**（推荐，最快上线）
2. **自有 VPS + Nginx**（plan 003 部署栈，统一域名）

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

- [`PREFLIGHT.md`](./PREFLIGHT.md) - design-taste-frontend skill §14 全部勾选
- [`TODO-assets.md`](./TODO-assets.md) - 真实素材占位登记（用户后续替换）

## 文案

所有可见文案集中管理在 [`lib/content.ts`](./lib/content.ts)。改文案改这一个文件。

## 部署到 plan 003 Nginx

详见 [plan 003 runbook §3.5](../devops/docs/runbook.md) - 域名解析、证书申请、nginx 静态卷挂载。

## 关键文件

```
website/
├── app/
│   ├── layout.tsx       # 根布局 + metadata
│   ├── globals.css      # Tailwind v4 + 设计令牌（双主题）
│   ├── page.tsx          # 首页组装
│   ├── privacy/page.tsx  # 隐私政策
│   └── not-found.tsx
├── components/
│   ├── layout/
│   │   ├── nav.tsx       # 单行 nav, 移动 details/summary 折叠
│   │   └── footer.tsx    # ICP 占位 + 链接
│   ├── sections/         # 7 个 section（hero / how / features / privacy-strip / download / faq）
│   └── motion/reveal.tsx # Motion 隔离岛
├── lib/
│   └── content.ts        # 全站文案
├── public/
│   └── apk/              # APK 占位 + README
├── vercel.json           # Vercel 部署配置（5 行）
├── PREFLIGHT.md          # skill §14 自查清单
├── TODO-assets.md         # 真实素材占位登记
└── README.md             # 本文件
```
