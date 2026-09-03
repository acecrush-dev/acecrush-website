#!/usr/bin/env node
/**
 * 三态主题 + 双 locale 实地验证脚本（plan 004 v4 §4 W-M4）。
 *
 * 用法：
 *   1. 用户跑 `cd website && npm install && npm run build && npx serve out -p 4173`（后台）
 *   2. 用户跑 `node website/scripts/verify-themes.mjs http://localhost:4173`
 *   3. 脚本用 Playwright headless 跑 6 个用例并截图到 website/PREFLIGHT-v4-themes/
 *
 * 注：本脚本仅作为参考实现；auto mode 不允许自动安装 Playwright（headless browser），
 * 由用户在本地手动执行。输出截图名按 plan §4 W-M4 命名规范。
 */
import { mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const screenshotDir = join(root, "PREFLIGHT-v4-themes");

if (!existsSync(screenshotDir)) mkdirSync(screenshotDir, { recursive: true });

const BASE = process.argv[2] ?? "http://localhost:4173";
const LOCALES = [
  { code: "zh-CN", path: "/" },
  { code: "en", path: "/en/" },
];

const CASES = [
  { id: "01-zh-system-light", path: "/", theme: "system", colorScheme: "light" },
  { id: "02-zh-system-dark", path: "/", theme: "system", colorScheme: "dark" },
  { id: "03-zh-explicit-light", path: "/", theme: "light", colorScheme: "light" },
  { id: "04-zh-explicit-dark", path: "/", theme: "dark", colorScheme: "dark" },
  { id: "05-en-explicit-light", path: "/en/", theme: "light", colorScheme: "light" },
  { id: "06-en-explicit-dark", path: "/en/", theme: "dark", colorScheme: "dark" },
];

// 这是一个用 Playwright 的参考实现；安装后才可运行：
//   npm install -D playwright && npx playwright install chromium
const instructions = `
PLAYWRIGHT VERIFICATION (one-time setup):

  cd website
  npm install -D playwright
  npx playwright install chromium

Then replace the body of this script with:

  import { chromium } from 'playwright';
  const browser = await chromium.launch();
  for (const c of CASES) {
    const ctx = await browser.newContext({
      colorScheme: c.colorScheme,
      storageState: { cookies: [], origins: [{
        origin: BASE, localStorage: [{ name: 'acecrush-theme', value: c.theme }],
      }] },
    });
    const page = await ctx.newPage();
    await page.goto(BASE + c.path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);  // 主题过渡 220ms + 余量
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    await page.screenshot({
      path: join(screenshotDir, c.id + '.png'),
      fullPage: false,
    });
    console.log(\`[\${c.id}] dark=\${hasDark} expected=\${c.theme === 'dark' || (c.theme === 'system' && c.colorScheme === 'dark')}\`);
    await ctx.close();
  }
  await browser.close();

Expected: 6/6 cases pass; "dark=" matches expected.
`;

console.log(instructions);
console.log(`Base URL: ${BASE}`);
console.log(`Screenshots will be written to: ${screenshotDir}`);
console.log(`Cases to verify: ${CASES.map((c) => c.id).join(", ")}`);