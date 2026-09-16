import { AppNav } from "@/components/layout/AppNav";
import { AppFooter } from "@/components/layout/AppFooter";

/**
 * PrivacyContent - 法务页 body 共享壳（plan 004 v4d + 用户 2026-09-16 复用为 Terms）。
 *
 * 渲染 Nav + section 列表 + Footer；section 内容由调用方传入（翻译后的 section 数据）。
 *
 * 历史：
 *   原 plan 004 写时只服务隐私页；/privacy 独立路由下线后本文件与 privacy.* 文案保留备用。
 *   2026-09-16 用户恢复 /privacy 和新增 /terms 路由，本组件复用为两份法务页的共享壳，
 *   同时接入 AppFooter（之前 footer 整块移除期间这里没有 footer，现在恢复）。
 */
export function PrivacyContent({
  title,
  effective,
  sections,
}: {
  title: string;
  effective: string;
  sections: {
    title: string;
    body?: string;
    list?: string[];
  }[];
}) {
  return (
    <>
      <AppNav />
      <main className="container-x py-24 lg:py-40 max-w-[760px]">
        <h1 className="text-[36px] md:text-[44px] leading-[1.1] tracking-tight font-semibold">
          {title}
        </h1>
        <p className="mt-3 text-[14px]" style={{ color: "var(--color-fg-subtle)" }}>
          {effective}
        </p>

        {sections.map((s, i) => (
          <section key={i} className="mt-10">
            <h2 className="text-[20px] font-semibold">{s.title}</h2>
            <div
              className="mt-3 text-[15px] leading-relaxed"
              style={{ color: "var(--color-fg-muted)" }}
            >
              {s.body ? <p>{s.body}</p> : null}
              {s.list ? (
                <div className="pl-5 space-y-1">
                  {s.list.map((li, j) => (
                    <div key={j} className="relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-[var(--color-fg-subtle)]">{li}</div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </main>
      <AppFooter />
    </>
  );
}