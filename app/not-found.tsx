/**
 * Top-level 404（plan 004 v4）。
 * output: 'export' 下生成 out/404.html 供 nginx 直接 serve 不匹配路径。
 * 内容用 zh-CN（默认 locale），en 用户也能看懂基本术语。
 */
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 32,
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "ui-monospace, monospace",
          color: "var(--color-fg-subtle)",
        }}
      >
        404
      </p>
      <h1
        style={{
          fontSize: 36,
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        找不到这页。
      </h1>
      <p style={{ color: "var(--color-fg-muted)", fontSize: 15 }}>
        Page not found. The link may be expired, or this page never existed.
      </p>
      <a
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "14px 24px",
          borderRadius: 999,
          background: "var(--color-accent)",
          color: "var(--color-accent-fg)",
          fontWeight: 600,
          textDecoration: "none",
          marginTop: 8,
        }}
      >
        回到首页 / Home
      </a>
    </main>
  );
}