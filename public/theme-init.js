// theme-init.js · plan 004 v6f / plan 001 §4-22
// 在 <head> 同步执行，防主题切换 FOUC。
// 通过 <script src="/theme-init.js"></script> 加载，避开 next/script 与 JSX <script> 的 React 19 warning。
// v6f：localStorage 无值时默认 'dark'（用户明确要求），不再跟系统。
// plan 001 §4-22（附录 A8）：删除两处 meta[name="theme-color"] 直写。
//   app/layout.tsx 的 Viewport.themeColor 已输出 light/dark 两条带 media
//   query 的 meta，浏览器自己会按系统配色挑；这里 querySelector 拿到第一条
//   硬写 content，反而把 media 语义覆盖掉。本文件只负责 .dark class。
(function () {
  try {
    var s = localStorage.getItem('acecrush-theme');
    var m = (s === 'light' || s === 'dark' || s === 'system') ? s : 'dark';
    var d = m === 'dark' || (m === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', d);
    // 同时把 locale 写一份 cookie，便于后续若切 SSR-by-cookie 时复用
    try {
      var loc = localStorage.getItem('acecrush-locale');
      if (loc === 'zh-CN' || loc === 'en') {
        document.cookie = 'acecrush-locale=' + loc + '; path=/; max-age=31536000';
      }
    } catch (e) {}
  } catch (e) {
    // localStorage 不可用，直接进 dark（v6f 默认）
    try {
      document.documentElement.classList.add('dark');
    } catch (e2) {}
  }
})();
