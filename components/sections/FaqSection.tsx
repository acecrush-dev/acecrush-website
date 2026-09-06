"use client";

import { useTranslations } from "next-intl";
import { Reveal } from "@/components/motion/reveal";

/**
 * FAQ - 原生 <details> 手风琴（plan §3.A 无 JS 也能读）。
 *
 * plan 001 §4-11：改为双产品分组。
 *   共享 h2 = `faq.heading`；每组 h3 = 该产品的 faq.heading；
 *   组内手风琴抽成模块级 <FaqList>，两组复用，避免复制粘贴两份 JSX。
 *   原生 <details>/<summary> 天然可访问（键盘 Enter/Space 展开），不引入 JS。
 */
const Q_KEYS = [
  { qKey: "q1", aKey: "a1" },
  { qKey: "q2", aKey: "a2" },
  { qKey: "q3", aKey: "a3" },
  { qKey: "q4", aKey: "a4" },
] as const;

export function FaqSection() {
  const t = useTranslations("faq");

  return (
    <section id="faq" className="container-x py-20 lg:py-28" aria-labelledby="faq-heading">
      <Reveal>
        <h2
          id="faq-heading"
          className="text-[32px] md:text-[40px] leading-[1.1] tracking-tight font-semibold"
        >
          {t("heading")}
        </h2>
      </Reveal>

      <FaqList namespace="products.craft.faq" headingId="faq-craft-heading" />
      <FaqList namespace="products.swing.faq" headingId="faq-swing-heading" />
    </section>
  );
}

function FaqList({
  namespace,
  headingId,
}: {
  namespace: "products.craft.faq" | "products.swing.faq";
  headingId: string;
}) {
  const t = useTranslations(namespace);

  return (
    <div className="mt-12" aria-labelledby={headingId}>
      <Reveal>
        <h3
          id={headingId}
          className="text-[20px] md:text-[24px] font-semibold tracking-tight"
          style={{ color: "var(--color-fg)" }}
        >
          {t("heading")}
        </h3>
      </Reveal>

      <Reveal delay={0.08}>
        <div
          className="mt-6 rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}
        >
          {Q_KEYS.map((it, i) => (
            <details
              key={it.qKey}
              className="group px-6 py-5"
              style={{
                borderTop: i === 0 ? "none" : "1px solid var(--color-divider)",
              }}
            >
              <summary className="flex items-center justify-between cursor-pointer list-none text-[16px] font-medium">
                <span>{t(it.qKey)}</span>
                <span
                  aria-hidden
                  className="ml-4 text-[18px] transition-transform group-open:rotate-45"
                  style={{ color: "var(--color-fg-muted)" }}
                >
                  +
                </span>
              </summary>
              <p
                className="mt-3 text-[15px] leading-relaxed max-w-[65ch]"
                style={{ color: "var(--color-fg-muted)" }}
              >
                {t(it.aKey)}
              </p>
            </details>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
