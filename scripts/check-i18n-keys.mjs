#!/usr/bin/env node
/**
 * i18n key 对齐校验（plan 004 v4 §4 W-M4 / §5）。
 * 比对 messages/zh-CN.json 与 messages/en.json 的所有 key 路径必须 100% 对齐。
 * 退出码：0 = OK；1 = 不一致。
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const locales = ["zh-CN", "en"];

function flatten(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flatten(v, key));
    } else {
      out.push(key);
    }
  }
  return out;
}

function load(p) {
  return JSON.parse(readFileSync(p, "utf-8"));
}

const sets = {};
for (const loc of locales) {
  sets[loc] = new Set(flatten(load(join(root, "messages", `${loc}.json`))));
}

const baseline = sets[locales[0]];
let failed = false;
for (const loc of locales.slice(1)) {
  const other = sets[loc];
  const missing = [...baseline].filter((k) => !other.has(k));
  const extra = [...other].filter((k) => !baseline.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`\n[FAIL] ${locales[0]} ↔ ${loc} mismatch`);
    if (missing.length) console.error(`  missing in ${loc}:`, missing.join(", "));
    if (extra.length) console.error(`  extra in ${loc}:`, extra.join(", "));
  } else {
    console.log(`[OK] ${locales[0]} ↔ ${loc} key-aligned (${baseline.size} keys)`);
  }
}

process.exit(failed ? 1 : 0);