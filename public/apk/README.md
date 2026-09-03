# APK 分发说明（plan 011）

`acecrush-craft.apk` **不再存放在此目录**。plan 011 起，APK 改走 **GitHub Releases** 分发：

- **下载链接（永久）**：<https://github.com/acecrush-dev/acecrushcraft/releases/latest/download/acecrush-craft.apk>
- 历史版本：`/releases` 页可看到所有 tag（如 `v1.0.0`、`v1.1.0+3`）

## 流程

1. 改 `app/pubspec.yaml` 的 `version`（手工控制）
2. 跑 `./app/scripts/release-apk.sh`
   - `flutter build apk --release`
   - `gh release create v<version> <apk>` 上传到 GitHub
3. ~1min 后 GitHub CDN 生效；用户访问 `/releases/latest/` 拿到新版

## 为什么改

- Vercel deployment 不再被 30MB+ APK 拖累（plan 011 收益）
- GitHub Releases public repo 免费无限带宽
- APK 二进制不进 Gitee 代码仓库（避免 100MB+ 仓库膨胀）
- 历史版本自动归档，无需手动清理

## 历史

- v6u 之前：APK 走 Vercel `public/apk/` 静态托管（已废弃）
- plan 011（当前）：APK 走 GitHub Releases