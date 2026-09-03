#!/usr/bin/env bash
# vercel-project.sh — Vercel 项目 CRUD（CLI 没 rename；走 REST API v9）
#
# 子命令：
#   list                       列出所有项目
#   info <name|id>             查项目详情（含 domain、git repo）
#   rename <old> <new>         重命名（CLI 没这功能，用 PATCH）
#   create <name> [framework]  建项目（framework: nextjs / vite / 等；默认 nextjs）
#   delete <name|id>           删项目（不可逆！需二次确认）
#   domains <name|id>          列项目下所有域名
#
# Auth：
#   优先用 ~/.vercel/auth.json（`vercel login` 后自动生成）的 OIDC token
#   否则用 --token <token> 手动传
#   否则用环境变量 VERCEL_TOKEN
#
# Team：
#   默认走个人账号；团队项目用 --team <slug> 指定
#
# 用法示例：
#   ./scripts/vercel-project.sh list
#   ./scripts/vercel-project.sh rename website AceCrush
#   ./scripts/vercel-project.sh create AceCrush nextjs
#   ./scripts/vercel-project.sh delete old-name
#   ./scripts/vercel-project.sh --team my-team list

set -euo pipefail

API="https://api.vercel.com/v9"
TEAM=""
TOKEN=""

# Vercel CLI 59.x 把 auth 存在 OS 标准配置目录（不同平台不同路径）
auth_file_macos="${HOME}/Library/Application Support/com.vercel.cli/auth.json"
auth_file_linux="${XDG_CONFIG_HOME:-${HOME}/.config}/com.vercel.cli/auth.json"
auth_file_legacy="${HOME}/.vercel/auth.json"

# === 参数解析 ===
while [[ $# -gt 0 ]]; do
  case "$1" in
    --token) TOKEN="$2"; shift 2 ;;
    --team) TEAM="$2"; shift 2 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) break ;;
  esac
done

CMD="${1:-}"
[[ -z "$CMD" ]] && { sed -n '2,20p' "$0"; exit 1; }
shift

# === Auth 解析（优先级：--token > env > 系统配置目录） ===
if [ -z "$TOKEN" ]; then
  TOKEN="${VERCEL_TOKEN:-}"
fi
if [ -z "$TOKEN" ]; then
  for f in "$auth_file_macos" "$auth_file_linux" "$auth_file_legacy"; do
    if [ -f "$f" ]; then
      TOKEN=$(python3 -c "
import json, sys
try:
    d = json.load(open('$f'))
    t = d.get('token') or d.get('access_token') or ''
    if d.get('expiresAt') and int(d['expiresAt']) < __import__('time').time():
        sys.exit(2)  # expired
    print(t)
except SystemExit as e:
    if e.code == 2: print('__EXPIRED__', file=sys.stderr); sys.exit(2)
    sys.exit(1)
except Exception:
    sys.exit(1)
" 2>/dev/null || true)
      [ -n "$TOKEN" ] && [ "$TOKEN" != "__EXPIRED__" ] && break
      TOKEN=""
    fi
  done
fi
if [ -z "$TOKEN" ]; then
  echo "✗ no token. Run one of:"
  echo "    vercel login                                    # 推荐（写入 ~/Library/Application Support/com.vercel.cli/auth.json）"
  echo "    export VERCEL_TOKEN=<...>                       # 或"
  echo "    $0 --token <...> list                            # 或"
  exit 1
fi

# === Team 参数 ===
team_qs=""
if [ -n "$TEAM" ]; then
  team_qs="?teamId=$TEAM"
fi

# === curl 包装 ===
api() {
  local METHOD="$1" PATH_="$2" BODY="${3:-}"
  local URL="$API$PATH_$team_qs"
  if [ -n "$BODY" ]; then
    curl -fsS -X "$METHOD" -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" -d "$BODY" "$URL"
  else
    curl -fsS -X "$METHOD" -H "Authorization: Bearer $TOKEN" "$URL"
  fi
}

# === 子命令 ===
case "$CMD" in
  list)
    api GET /projects | python3 -c "
import json, sys
for p in json.load(sys.stdin)['projects']:
    print(f\"{p['id']:<26} {p['name']:<30}\")
"
    ;;

  info)
    NAME="${1:?usage: $0 info <name|id>}"
    api GET "/projects/$NAME" | python3 -m json.tool | head -60
    ;;

  rename)
    OLD="${1:?usage: $0 rename <old> <new>}"
    NEW="${2:?usage: $0 rename <old> <new>}"
    echo "==> rename '$OLD' -> '$NEW'"
    api PATCH "/projects/$OLD" "{\"name\":\"$NEW\"}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(f\"✓ renamed: id={d.get('id')} new_name={d.get('name')}\")
"
    echo "==> 重要：rename 后 .vercel/project.json 里的 oldName 已失效，需要重新 link："
    echo "      rm .vercel/project.json && vercel link --yes"
    ;;

  create)
    NAME="${1:?usage: $0 create <name>}"
    FRAMEWORK="${2:-nextjs}"
    echo "==> create project '$NAME' (framework=$FRAMEWORK)"
    api POST /projects "{\"name\":\"$NAME\",\"framework\":\"$FRAMEWORK\"}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(f\"✓ created: id={d.get('id')} name={d.get('name'])}\")
"
    ;;

  delete)
    NAME="${1:?usage: $0 delete <name|id>}"
    echo "==> 将删除 '$NAME'（不可逆）"
    read -p "确认？键入 'delete' 继续： " confirm
    [ "$confirm" = "delete" ] || { echo "✗ 已取消"; exit 1; }
    api DELETE "/projects/$NAME" >/dev/null
    echo "✓ deleted '$NAME'"
    ;;

  domains)
    NAME="${1:?usage: $0 domains <name|id>}"
    api GET "/projects/$NAME/domains" | python3 -c "
import json, sys
for d in json.load(sys.stdin).get('domains', []):
    verified = d.get('verified')
    redirect = d.get('redirect')
    extra = ' -> ' + redirect if redirect else (' [verified]' if verified else ' [PENDING]')
    print(f\"  {d['name']:<40}{extra}\")
"
    ;;

  add-domain)
    NAME="${1:?usage: $0 add-domain <project> <domain>}"
    DOMAIN="${2:?usage: $0 add-domain <project> <domain>}"
    echo "==> add domain '$DOMAIN' to project '$NAME'"
    api POST "/projects/$NAME/domains" "{\"name\":\"$DOMAIN\"}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
name = d.get('name') or '?'
verified = d.get('verified')
print('  ' + str(name) + ' verified=' + str(verified))
print('  Vercel will issue a Let\\'s Encrypt certificate (about 30s to 5min).')
"
    ;;

  del-domain)
    NAME="${1:?usage: $0 del-domain <project> <domain>}"
    DOMAIN="${2:?usage: $0 del-domain <project> <domain>}"
    echo "==> remove domain '$DOMAIN' from project '$NAME'"
    api DELETE "/projects/$NAME/domains/$DOMAIN" >/dev/null
    echo "  ✓ removed"
    ;;

  *)
    echo "✗ unknown command: $CMD"
    sed -n '2,20p' "$0"
    exit 1
    ;;
esac
