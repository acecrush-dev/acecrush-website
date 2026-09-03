/**
 * 防闪ing inline script（plan 004 v4 §3 + §5 FOUC risk）。
 *
 * 用法：在 [locale]/layout.tsx 的 <head> 里以 <Script id="theme-init" strategy="beforeInteractive">
 * 或直接 <script dangerouslySetInnerHTML> 注入。
 *
 * 逻辑（必须在 hydration 前同步执行）：
 * 1. 读 localStorage('acecrush-theme')，若无效则视为 'system'
 * 2. 若 mode === 'system'，读 prefers-color-scheme
 * 3. 给 <html> 加 'dark' class（若实际为 dark）
 * 4. 同步 meta[name=theme-color]
 *
 * 故意写成纯字符串以避免 React/Next 编译抖动。
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('acecrush-theme');var m=(s==='light'||s==='dark'||s==='system')?s:'system';var d=m==='dark'||(m==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);var c=d?'dark':'light';var r=document.documentElement;r.classList.toggle('dark',d);var meta=document.querySelector('meta[name=\"theme-color\"]');if(meta)meta.setAttribute('content',d?'#0F1A12':'#FAFAF6');}catch(e){}})();`;