"use client";

import { useTranslations } from "next-intl";
import { Reveal } from "@/components/motion/reveal";

/**
 * FAQ - 原生 <details> 手风琴（plan §3.A 无 JS 也能读）。
 * 用 6 个 q/a key 映射；不依赖任何 client JS。
 */
export function FaqSection() {
  const t = useTranslations("faq");
  const items = [
    { qKey: "q1", aKey: "a1" },
    { qKey: "q2", aKey: "a2" },
    { qKey: "q3", aKey: "a3" },
    { qKey: "q4", aKey: "a4" },
  ] as const;

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

      <Reveal delay={0.1}>
        <div
          className="mt-10 rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}
        >
          {items.map((it, i) => (
            <details
              key={i}
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
    </section>
  );
}