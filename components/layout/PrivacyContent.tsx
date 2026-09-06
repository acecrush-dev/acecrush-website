import { AppNav } from "@/components/layout/AppNav";

/**
 * PrivacyContent - 双语隐私政策页 body 共享壳（plan 004 v4 v4d）。
 *
 * 渲染 Nav + section 列表；section 内容由调用方传入（翻译后的 section 数据）。
 *
 * 注：本组件当前没有任何路由在用（/privacy 独立路由已下线，plan 001 §2 Out
 * 明确保留此文件与 privacy.* 文案供将来复用）。
 * 用户 2026-09-05 移除全站 footer 后，这里的 <AppFooter /> 一并删除。
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
      <main className="container-x py-16 lg:py-24 max-w-[760px]">
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
    </>
  );
}