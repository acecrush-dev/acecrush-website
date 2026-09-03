// theme-init.js · plan 004 v6f
// 在 <head> 同步执行，防主题切换 FOUC。
// 通过 <script src="/theme-init.js"></script> 加载，避开 next/script 与 JSX <script> 的 React 19 warning。
// v6f：localStorage 无值时默认 'dark'（用户明确要求），不再跟系统。
(function () {
  try {
    var s = localStorage.getItem('acecrush-theme');
    var m = (s === 'light' || s === 'dark' || s === 'system') ? s : 'dark';
    var d = m === 'dark' || (m === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var r = document.documentElement;
    r.classList.toggle('dark', d);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', d ? '#0E1410' : '#FAFAF6');
    // 同时把 locale 写一份 cookie，便于后续若切 SSR-by-cookie 时复用
    try {
      var loc = localStorage.getItem('acecrush-locale');
      if (loc === 'zh-CN' || loc === 'en') {
        document.cookie = 'acecrush-locale=' + loc + '; path=/; max-age=31536000';
      }
    } catch (e) {}
  } catch (e) {
    // localStorage 不可用 — 直接进 dark（v6f 默认）
    try {
      document.documentElement.classList.add('dark');
      var meta2 = document.querySelector('meta[name="theme-color"]');
      if (meta2) meta2.setAttribute('content', '#0E1410');
    } catch (e2) {}
  }
})();