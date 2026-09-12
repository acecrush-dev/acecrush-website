#!/usr/bin/env node
/**
 * Smoke tests — 不依赖 Next dev/build，纯 node 自检，CI 可直接跑。
 *
 * 覆盖（plan 004 v6c / plan 001 §4-23）：
 *  1. i18n key 100% 对齐（messages/zh-CN.json ↔ messages/en.json）
 *  2. messages JSON 格式合法（无语法错误）
 *  3. 关键文件存在（store / I18nProvider / ThemeProvider / sections / AppNav）
 *  4. 设计令牌齐全（globals.css 必含 8 个 --color-* token + .dark 覆盖）
 *  5. 无 em-dash 散布（lib/components/app/messages 源码）
 *  6. 无科技绿色 hex 散落（除 globals.css 外）
 *  7. 无 ICP 备案残留
 *  8. 无 [locale] 动态段残留
 *  9. 无 @/i18n/navigation 老引用
 * 10. package.json 必要依赖存在
 * 11. AppNav 联系邮箱为 acecrushdev@gmail.com（用户 2026-09-11 切换）
 * 12. 全源码无旧邮箱 hi@acecrush.dev 残留（plan 001）
 *
 * 退出码：0 = 全部 PASS；1 = 任一 FAIL。
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const fs = { readFileSync, existsSync, readdirSync };

function walk(dir, visit) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p, visit);
    else visit(p);
  }
}
const passed = [];
const failed = [];

function ok(name) { passed.push(name); console.log(`  ✓ ${name}`); }
function fail(name, msg) { failed.push({ name, msg }); console.log(`  ✗ ${name}  ${msg}`); }
function read(p) { return readFileSync(join(root, p), "utf-8"); }
function exists(p) { return existsSync(join(root, p)); }

console.log("\n[1/12] i18n key 100% 对齐");
try {
  const flatten = (obj, prefix = "") => {
    const out = [];
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) out.push(...flatten(v, key));
      else out.push(key);
    }
    return out;
  };
  const zh = new Set(flatten(JSON.parse(read("messages/zh-CN.json"))));
  const en = new Set(flatten(JSON.parse(read("messages/en.json"))));
  const missing = [...zh].filter((k) => !en.has(k));
  const extra = [...en].filter((k) => !zh.has(k));
  if (missing.length || extra.length) {
    fail("i18n keys aligned", `missing in en: ${missing.join(",")} | extra in en: ${extra.join(",")}`);
  } else {
    ok(`i18n keys aligned (${zh.size} keys)`);
  }
} catch (e) {
  fail("i18n keys aligned", e.message);
}

console.log("\n[2/12] messages JSON 格式合法");
for (const loc of ["zh-CN", "en"]) {
  try {
    JSON.parse(read(`messages/${loc}.json`));
    ok(`messages/${loc}.json valid JSON`);
  } catch (e) {
    fail(`messages/${loc}.json`, e.message);
  }
}

console.log("\n[3/12] 关键文件存在");
const required = [
  "lib/i18n/store.ts",
  "lib/i18n/I18nProvider.tsx",
  "lib/theme/ThemeProvider.tsx",
  "lib/theme/ThemeScript.tsx",
  "components/i18n/LocaleLangSync.tsx",
  "components/layout/AppNav.tsx",
  "components/layout/LandingContent.tsx",
  "components/layout/PrivacyContent.tsx",
  "components/layout/LocaleSwitcher.tsx",
  "components/layout/ThemeSwitcher.tsx",
  "components/sections/BrandHero.tsx",
  "components/sections/CraftHero.tsx",
  "components/brand/TennisBallGlobe.tsx",
  "components/sections/FeatureCard.tsx",
  "components/sections/SwingSection.tsx",
  "components/sections/HowItWorks.tsx",
  "components/sections/FeaturesBento.tsx",
  "components/sections/PrivacyStrip.tsx",
  "components/sections/DownloadSection.tsx",
  "components/sections/FaqSection.tsx",
  "components/motion/reveal.tsx",
  // plan 003 §4-15：3D 沉浸重构新增文件
  "components/three/tennisBall.ts",
  "components/three/overlay.ts",
  "components/three/tween.ts",
  "components/three/panelTexture.ts",
  "components/three/GlobeScene.ts",
  "components/three/RoomScene.ts",
  "components/three/roomConfigs.ts",
  "components/three/SceneManager.ts",
  "components/three/brandText.ts",
  "components/three/DetailPopup.tsx",
  "components/three/ThreeExperience.tsx",
  "lib/three/viewStore.ts",
  "app/layout.tsx",
  "app/page.tsx",
  "app/not-found.tsx",
  "app/icon.png",
  "i18n/request.ts",
  "next.config.mjs",
];
for (const f of required) {
  if (exists(f)) ok(f);
  else fail(f, "missing");
}

console.log("\n[4/12] 设计令牌齐全");
const css = read("app/globals.css");
const requiredTokens = [
  "--color-bg",
  "--color-bg-elevated",
  "--color-surface",
  "--color-surface-tint",
  "--color-fg",
  "--color-fg-muted",
  "--color-fg-subtle",
  "--color-border",
  "--color-accent",
  "--color-accent-fg",
  "--color-accent-soft",
];
for (const t of requiredTokens) {
  if (css.includes(`${t}:`)) ok(`globals.css defines ${t}`);
  else fail(`globals.css defines ${t}`, "missing");
}
// dark overrides
const darkCount = (css.match(/\.dark\s*\{/g) || []).length;
if (darkCount >= 1) ok(`.dark override block (×${darkCount})`);
else fail(".dark override block", "missing");

console.log("\n[5/12] 无 em-dash 散布");
let emDashHits = [];
for (const d of ["lib", "components", "app", "messages"]) {
  walk(join(root, d), (p) => {
    if (!/\.(ts|tsx|json)$/.test(p)) return;
    const c = readFileSync(p, "utf-8");
    if (/[—–]/.test(c)) emDashHits.push(p);
  });
}
if (emDashHits.length === 0) ok("no em/en dash in src");
else fail("no em/en dash", emDashHits.join(", "));

console.log("\n[6/12] 无科技绿色 hex 散落");
let greenHexHits = [];
for (const d of ["lib", "components", "app", "messages", "i18n"]) {
  walk(join(root, d), (p) => {
    if (!/\.(ts|tsx|json)$/.test(p)) return;
    const c = readFileSync(p, "utf-8");
    const matches = c.match(/#00FF8A|#008F4D|#00B86B|#00E676/g);
    if (matches) greenHexHits.push({ file: p, count: matches.length });
  });
}
const offGlobals = greenHexHits.filter((h) => !h.file.endsWith("globals.css"));
if (offGlobals.length === 0) ok("tech-green hex only in globals.css");
else fail("tech-green hex scattered", `${offGlobals.length} files`);

console.log("\n[7/12] 无 ICP 备案残留");
let icpHits = [];
for (const d of ["app", "components", "lib", "messages", "i18n"]) {
  walk(join(root, d), (p) => {
    if (!/\.(ts|tsx|json)$/.test(p)) return;
    const c = readFileSync(p, "utf-8");
    if (/icp|ICP|备案/.test(c)) icpHits.push(p);
  });
}
if (icpHits.length === 0) ok("no ICP ref in source");
else fail("no ICP ref", icpHits.join(", "));

console.log("\n[8/12] 无 [locale] 动态段残留");
let hasLocale = false;
walk(join(root, "app"), (p) => {
  if (p.includes("[locale]")) hasLocale = true;
});
if (!hasLocale) ok("no [locale] dir in app/");
else fail("no [locale] dir", "still exists");

console.log("\n[9/12] 无 @/i18n/navigation 老引用");
let oldRefs = [];
for (const d of ["app", "components"]) {
  walk(join(root, d), (p) => {
    if (!/\.(ts|tsx)$/.test(p)) return;
    const c = readFileSync(p, "utf-8");
    if (c.includes("@/i18n/navigation")) oldRefs.push(p);
  });
}
if (oldRefs.length === 0) ok("no @/i18n/navigation refs");
else fail("no @/i18n/navigation refs", oldRefs.join(", "));

console.log("\n[10/12] package.json 必要依赖");
const pkg = JSON.parse(read("package.json"));
const requiredDeps = ["next", "react", "react-dom", "motion", "@phosphor-icons/react", "next-intl"];
const missingDeps = requiredDeps.filter((d) => !pkg.dependencies[d]);
if (missingDeps.length === 0) ok(`all required deps present`);
else fail("deps missing", missingDeps.join(", "));

console.log("\n[11/12] 联系邮箱已切到 acecrushdev@gmail.com");
// 用户 2026-09-05 移除全站 footer，联系入口搬到 AppNav 右上角，故这里改查 AppNav。
const navSrc = read("components/layout/AppNav.tsx");
if (navSrc.includes("acecrushdev@gmail.com")) ok("AppNav contact mailto uses new address");
else fail("AppNav contact mailto", "acecrushdev@gmail.com not found");

console.log("\n[12/12] 无旧邮箱 hi@acecrush.dev 残留");
let oldMailHits = [];
for (const d of ["app", "components", "lib", "messages", "i18n"]) {
  walk(join(root, d), (p) => {
    if (!/\.(ts|tsx|json|css)$/.test(p)) return;
    const c = readFileSync(p, "utf-8");
    if (c.includes("hi@acecrush.dev")) oldMailHits.push(p);
  });
}
if (oldMailHits.length === 0) ok("no hi@acecrush.dev in source");
else fail("no hi@acecrush.dev", oldMailHits.join(", "));

// Summary
console.log("\n" + "=".repeat(60));
console.log(`PASSED: ${passed.length}`);
console.log(`FAILED: ${failed.length}`);
if (failed.length > 0) {
  console.log("\nFAILURES:");
  for (const f of failed) console.log(`  ✗ ${f.name} — ${f.msg}`);
  process.exit(1);
}
console.log("\nAll smoke checks passed ✓\n");