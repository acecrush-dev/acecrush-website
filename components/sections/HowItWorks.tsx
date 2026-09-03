"use client";

import { useTranslations } from "next-intl";
import { Reveal, RevealStagger } from "@/components/motion/reveal";

/**
 * How it works - 错位三段（不是等宽三卡，plan §4.3 / §9.C）。
 * 桌面横排错位；移动端单列堆叠。
 */
export function HowItWorks() {
  const t = useTranslations("howItWorks");
  const steps = [
    { labelKey: "step1Label", bodyKey: "step1Body" },
    { labelKey: "step2Label", bodyKey: "step2Body" },
    { labelKey: "step3Label", bodyKey: "step3Body" },
  ] as const;

  return (
    <section
      id="how-it-works"
      className="container-x py-20 lg:py-28"
      aria-labelledby="how-heading"
    >
      <Reveal>
        <h2
          id="how-heading"
          className="text-[32px] md:text-[44px] leading-[1.1] tracking-tight font-semibold max-w-[20ch]"
          style={{ color: "var(--color-fg)" }}
        >
          {t("heading")}
        </h2>
      </Reveal>

      <RevealStagger
        className="mt-14 grid gap-6 md:grid-cols-3 md:[&>div:nth-child(2)]:translate-y-8"
        items={steps.map((s, i) => (
          <StepCard
            key={i}
            index={i + 1}
            label={t(s.labelKey)}
            body={t(s.bodyKey)}
            stepPrefix={t("stepPrefix")}
          />
        ))}
      />
    </section>
  );
}

function StepCard({
  index,
  label,
  body,
  stepPrefix,
}: {
  index: number;
  label: string;
  body: string;
  stepPrefix: string;
}) {
  // 注意：父级 RevealStagger 已经在外层包了 <motion.li>，这里必须用 <div>，
  // 否则 <li> 嵌套 <li> 触发 React validateDOMNesting + hydration mismatch。
  return (
    <div
      className="card-elevated p-7 min-h-[200px] flex flex-col gap-3"
      style={{ background: "var(--color-bg-elevated)" }}
    >
      <div className="text-[12px] text-mono" style={{ color: "var(--color-fg-subtle)" }}>
        {stepPrefix} {index}
      </div>
      <div className="text-[22px] font-semibold leading-snug" style={{ color: "var(--color-fg)" }}>
        {label}
      </div>
      <p className="text-[14px] leading-relaxed" style={{ color: "var(--color-fg-muted)" }}>
        {body}
      </p>
    </div>
  );
}