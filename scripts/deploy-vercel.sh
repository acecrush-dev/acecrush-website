#!/usr/bin/env bash
# deploy-vercel.sh — 部署 AceCrush Craft 官网到 Vercel
# 复刻 ainnis_web/scripts/deploy-vercel.js 的纯 CLI 流程（gitee / GitHub 都行）
#
# 前置（一次性）：
#   1. Vercel 账号（https://vercel.com/signup）
#   2. Cloudflare 账号 + 域名 acecrush.dev（DNS 托管在 CF）
#   3. 本机装 vercel CLI：npm i -g vercel
#   4. vercel login（浏览器授权）— 脚本会自动检测登录态，未登录时自动触发
#   5. 在 website/ 目录跑一次 `vercel link`（创建项目链接，存到 .vercel/project.json）
#
# 流程：
#   1. CF DNS：apex A 76.76.21.21 + www CNAME cname.vercel-dns.com
#   2. npm run build → out/
#   3. npx vercel deploy --prod --yes（直接上传 out/，项目由 .vercel/project.json 决定）
#      —— 首次部署需在 website/ 跑 `npx vercel link`（交互式选 acecrush-craft）；
#         想换项目就 `rm .vercel/project.json && npx vercel link`（2026-08-26 简化）
#
# 环境变量（只需 CF 三个；VERCEL_TOKEN 不需要 —— `vercel login` 已认证本机）：
#   CF_API_KEY      Cloudflare API Token（账号 → API Tokens → Create，权限 Zone:DNS:Edit）
#   CF_EMAIL        Cloudflare 账号邮箱
#   CF_ZONE          默认 acecrush.dev
#
# 用法：
#   ./scripts/deploy-vercel.sh            # 完整部署（CF DNS + build + Vercel deploy）
#   DRY_RUN=1 ./scripts/deploy-vercel.sh  # 只跑 CF DNS 那步（dry-run），build + deploy 仍会执行
#   ./scripts/deploy-vercel.sh --skip-dns  # 跳过 DNS 更新（已配置过的情况）

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# 自动加载 .env（如果存在且未在 shell 里设过）
if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

SKIP_DNS=0
if [ "${1:-}" = "--skip-dns" ]; then SKIP_DNS=1; fi

CF_ZONE="${CF_ZONE:-acecrush.dev}"
: "${CF_API_KEY:?need CF_API_KEY (Cloudflare API Token)}"
: "${CF_EMAIL:?need CF_EMAIL}"
DRY_RUN="${DRY_RUN:-0}"

VERCEL_IP="76.76.21.21"

if [ "$SKIP_DNS" -eq 0 ]; then
  echo "==> [1/4] update Cloudflare DNS -> Vercel"

  ZONE_ID=$(curl -fsS \
    -H "Authorization: Bearer $CF_API_KEY" \
    "https://api.cloudflare.com/client/v4/zones?name=$CF_ZONE" \
    | python3 -c "import sys, json; print(json.load(sys.stdin)['result'][0]['id'])")

  update_record() {
    local TYPE="$1" NAME="$2" CONTENT="$3"
    local EXISTING=$(curl -fsS \
      -H "Authorization: Bearer $CF_API_KEY" \
      "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?name=$NAME&type=$TYPE")
    local ID=$(echo "$EXISTING" | python3 -c "import sys, json; r=json.load(sys.stdin)['result']; print(r[0]['id'] if r else '')")
    if [ -n "$ID" ]; then
      echo "  update $TYPE $NAME -> $CONTENT (id=$ID)"
      if [ "$DRY_RUN" = "1" ]; then return; fi
      curl -fsS -X PUT \
        -H "Authorization: Bearer $CF_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"$TYPE\",\"name\":\"$NAME\",\"content\":\"$CONTENT\",\"ttl\":1,\"proxied\":false}" \
        "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$ID" >/dev/null
    else
      echo "  create $TYPE $NAME -> $CONTENT"
      if [ "$DRY_RUN" = "1" ]; then return; fi
      curl -fsS -X POST \
        -H "Authorization: Bearer $CF_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"$TYPE\",\"name\":\"$NAME\",\"content\":\"$CONTENT\",\"ttl\":1,\"proxied\":false}" \
        "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" >/dev/null
    fi
  }

  update_record A "$CF_ZONE" "$VERCEL_IP"
  update_record CNAME "www.$CF_ZONE" "cname.vercel-dns.com"
fi

echo "==> [2/4] vercel login check"
# 2026-09-07 修复"卡死"：本机没装全局 vercel 时，`npx vercel whoami` 会先弹
# "Ok to proceed? (y)" 安装确认 —— 该提问走 stderr，被 2>/dev/null 吞掉后
# 脚本就停在等你按 y 的地方，看起来像永远卡住。
# 处理：优先用全局 vercel；否则 npx --yes（自动确认，不再提问），且不吞 stderr。
if command -v vercel >/dev/null 2>&1; then
  VERCEL_BIN="vercel"
else
  echo "  未找到全局 vercel CLI → 改用 npx --yes vercel（首次自动下载，可能较慢）"
  echo "  建议先执行一次:  npm i -g vercel   （之后本脚本直接用全局命令，秒过）"
  VERCEL_BIN="npx --yes vercel"
fi
VERCEL_USER="$($VERCEL_BIN whoami || true)"
if [ -z "$VERCEL_USER" ]; then
  echo "  Vercel 未登录 → 运行 vercel login（浏览器授权）"
  $VERCEL_BIN login
else
  echo "  Vercel 已登录: $VERCEL_USER"
fi

echo "==> [3/4] build"
npm run build

echo "==> [4/4] deploy to Vercel (CLI)"
# 信任 .vercel/project.json 里的 link 配置；如果不存在（或项目搞错了想重 link），
# 手动跑一次 `npx vercel link`（交互式，选 acecrush-craft）然后重 deploy。
if [ -f ".vercel/project.json" ]; then
  CURRENT_PROJECT="$(grep -o '"projectName":"[^"]*"' .vercel/project.json | head -1 | cut -d'"' -f4)"
  echo "  using saved Vercel project config: $CURRENT_PROJECT"
  echo "  (re-link 到别的项目:  rm .vercel/project.json && npx vercel link)"
  # 同 [2/4] 的修复：用解析好的 VERCEL_BIN，避免 npx 安装确认提问卡死
  $VERCEL_BIN deploy --prod --yes
else
  echo "  ❌ .vercel/project.json 不存在 — 需要先 link 一次"
  echo "     在 website/ 目录跑:  npx vercel link"
  echo "     交互式提示时选 / 创建名为 'acecrush-craft' 的项目"
  echo "     link 完再跑一次 deploy-vercel.sh 即可"
  exit 1
fi

echo "==> done. Visit https://$CF_ZONE (DNS 生效需 1-5 分钟)"
