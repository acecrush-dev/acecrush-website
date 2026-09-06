"use client";

import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/motion/reveal";

/**
 * Privacy Strip - 全宽强调段（plan §4.7 不同 layout family）
 * 与 App 隐私口径一致，是 v4 关键差异化卖点。
 *
 * plan 001 §4-9：文案 key 由 `privacyStrip.*` 改为 `products.craft.privacyStrip.*`；
 * heading 降为 h3（页面 h1 = BrandHero，h2 = CraftHero 产品头）。
 */
export function PrivacyStrip() {
  const t = useTranslations("products.craft.privacyStrip");
  return (
    <section
      className="py-20 lg:py-24"
      style={{ background: "var(--color-surface)" }}
      aria-labelledby="privacy-heading"
    >
      <div className="container-x">
        <Reveal>
          <div className="flex items-start gap-5 max-w-[760px]">
            <div
              className="flex-shrink-0 inline-flex items-center justify-center rounded-2xl"
              style={{
                width: 56,
                height: 56,
                background: "var(--color-accent)",
                color: "var(--color-accent-fg)",
              }}
              aria-hidden
            >
              <ShieldCheck size={28} weight="fill" />
            </div>
            <div>
              <h3
                id="privacy-heading"
                className="text-[26px] md:text-[34px] leading-[1.15] tracking-tight font-semibold"
                style={{ color: "var(--color-fg)" }}
              >
                {t("heading")}
              </h3>
              <p
                className="mt-3 text-[16px] md:text-[17px] leading-relaxed max-w-[58ch]"
                style={{ color: "var(--color-fg-muted)" }}
              >
                {t("body")}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
