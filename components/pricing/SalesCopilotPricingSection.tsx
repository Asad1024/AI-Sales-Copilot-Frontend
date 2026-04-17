"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Icons } from "@/components/ui/Icons";
import {
  pricingPlansByLayout,
  type SalesCopilotPricingPlan,
} from "@/lib/salesCopilotPricing";
import { apiRequest, getUser } from "@/lib/apiClient";

type Variant = "landing" | "portal";

type SalesCopilotPricingSectionProps = {
  variant: Variant;
  intro?: string | null;
  pageTitle?: string;
  enableCheckout?: boolean;
};

function PortalPlanCard({
  plan,
  busyId,
  onCta,
  enableCheckout,
  onMarketingCta,
  compact,
  isCurrentPlan,
}: {
  plan: SalesCopilotPricingPlan;
  busyId: string | null;
  onCta: (plan: SalesCopilotPricingPlan) => void;
  enableCheckout: boolean;
  onMarketingCta: (plan: SalesCopilotPricingPlan) => void;
  compact?: boolean;
  isCurrentPlan?: boolean;
}) {
  const isCustom = plan.kind === "custom";
  const ctaLabel = enableCheckout
    ? isCustom
      ? "Contact sales"
      : "Choose plan"
    : isCustom
      ? "Contact sales"
      : "Get started";
  const busy = busyId === plan.id;
  const pad = compact ? 22 : 28;
  const titleSize = compact ? 18 : 20;
  const priceSize = compact ? 28 : 32;

  return (
    <div
      className="card-enhanced"
      style={{
        padding: pad,
        borderRadius: 20,
        border: plan.featured ? "2px solid rgba(37, 99, 235, 0.45)" : "1px solid var(--color-border, #e5e7eb)",
        background: plan.featured
          ? "linear-gradient(145deg, rgba(37, 99, 235, 0.06) 0%, rgba(6, 182, 212, 0.04) 100%)"
          : "var(--color-surface, #fff)",
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        position: "relative",
        height: "100%",
      }}
    >
      {plan.badge && (
        <span
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            padding: "4px 9px",
            borderRadius: 999,
            background: "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
            color: "#fff",
          }}
        >
          {plan.badge}
        </span>
      )}
      <h3
        style={{
          fontSize: titleSize,
          fontWeight: 800,
          margin: "0 0 6px",
          color: "var(--color-text)",
          letterSpacing: "-0.02em",
          paddingRight: plan.badge ? 72 : 0,
        }}
      >
        {plan.name}
      </h3>
      <p
        style={{
          fontSize: compact ? 13 : 14,
          color: "var(--color-text-muted)",
          margin: "0 0 12px",
          lineHeight: 1.45,
        }}
      >
        {plan.headline}
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontSize: priceSize, fontWeight: 800, color: "#2563EB" }}>{plan.priceDisplay}</span>
        {plan.priceSub ? (
          <span style={{ fontSize: compact ? 13 : 15, color: "var(--color-text-muted)" }}>{plan.priceSub}</span>
        ) : null}
      </div>
      {typeof plan.leadQuota === "number" && (
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)", margin: "0 0 12px" }}>
          {plan.leadQuota} enriched leads / month
        </p>
      )}
      <div style={{ flex: 1 }}>
        {plan.sections.map((sec) => (
          <div key={sec.heading} style={{ marginBottom: compact ? 12 : 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--color-text-muted)",
                marginBottom: 6,
              }}
            >
              {sec.heading}
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: compact ? 6 : 8,
              }}
            >
              {sec.bullets.map((b) => (
                <li
                  key={b}
                  style={{
                    display: "flex",
                    gap: 8,
                    fontSize: compact ? 12.5 : 14,
                    color: "var(--color-text)",
                    lineHeight: 1.45,
                  }}
                >
                  <Check
                    size={compact ? 15 : 18}
                    strokeWidth={2.25}
                    style={{ flexShrink: 0, color: "#2563EB", marginTop: 2 }}
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {plan.footnote ? (
        <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 12px", lineHeight: 1.45 }}>
          {plan.footnote}
        </p>
      ) : null}
      {isCustom ? (
        <Link
          href="/contact"
          className="btn-primary"
          style={{
            display: "inline-flex",
            justifyContent: "center",
            width: "100%",
            padding: compact ? "12px 14px" : "14px 18px",
            borderRadius: 12,
            fontWeight: 700,
            textDecoration: "none",
            textAlign: "center",
            fontSize: compact ? 14 : undefined,
          }}
        >
          {ctaLabel}
        </Link>
      ) : isCurrentPlan ? (
        <div
          role="status"
          style={{
            width: "100%",
            padding: compact ? "12px 14px" : "14px 18px",
            borderRadius: 12,
            fontWeight: 700,
            textAlign: "center",
            fontSize: compact ? 14 : undefined,
            border: "1px solid rgba(37, 99, 235, 0.4)",
            background: "rgba(37, 99, 235, 0.1)",
            color: "#5b21b6",
          }}
        >
          Current plan
        </div>
      ) : enableCheckout ? (
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => onCta(plan)}
          style={{
            width: "100%",
            padding: compact ? "12px 14px" : "14px 18px",
            borderRadius: 12,
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.85 : 1,
            fontSize: compact ? 14 : undefined,
          }}
        >
          {busy ? "Please wait…" : ctaLabel}
        </button>
      ) : (
        <button
          type="button"
          className="btn-primary"
          onClick={() => onMarketingCta(plan)}
          style={{
            width: "100%",
            padding: compact ? "12px 14px" : "14px 18px",
            borderRadius: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: compact ? 14 : undefined,
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

function PortalSetupPairCard({
  plan,
  busyId,
  onCta,
  enableCheckout,
  onMarketingCta,
}: {
  plan: SalesCopilotPricingPlan;
  busyId: string | null;
  onCta: (plan: SalesCopilotPricingPlan) => void;
  enableCheckout: boolean;
  onMarketingCta: (plan: SalesCopilotPricingPlan) => void;
}) {
  const busy = busyId === plan.id;
  const bullets = plan.sections.flatMap((s) => s.bullets);

  return (
    <div
      className="card-enhanced"
      style={{
        borderRadius: 16,
        border: "1px solid rgba(37, 99, 235, 0.32)",
        background: "var(--color-surface, #fff)",
        padding: "16px 18px 18px",
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        boxShadow: "0 10px 24px rgba(37, 99, 235, 0.06)",
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#06B6D4",
          marginBottom: 8,
        }}
      >
        Step 1 · Required first
      </span>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px", color: "var(--color-text)", letterSpacing: "-0.02em" }}>
        {plan.name}
      </h2>
      <p style={{ fontSize: 12.5, color: "var(--color-text-muted)", margin: "0 0 10px", lineHeight: 1.45 }}>
        {plan.headline} Monthly plans and add-ons below activate after setup.
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: "#2563EB" }}>{plan.priceDisplay}</span>
        {plan.priceSub ? (
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{plan.priceSub}</span>
        ) : null}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
        {bullets.map((b) => (
          <div key={b} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "var(--color-text)", lineHeight: 1.4 }}>
            <Check size={15} strokeWidth={2.25} style={{ flexShrink: 0, color: "#2563EB", marginTop: 2 }} />
            <span>{b}</span>
          </div>
        ))}
      </div>
      {plan.footnote ? (
        <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 12px", lineHeight: 1.45 }}>{plan.footnote}</p>
      ) : null}
      <div style={{ marginTop: "auto" }}>
        {enableCheckout ? (
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => onCta(plan)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 11,
              fontWeight: 700,
              fontSize: 13,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Please wait…" : "Start with setup"}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={() => onMarketingCta(plan)}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 11, fontWeight: 700, fontSize: 13 }}
          >
            Get started
          </button>
        )}
      </div>
    </div>
  );
}

function PortalCustomPairCard({ plan }: { plan: SalesCopilotPricingPlan }) {
  const chips = plan.sections.flatMap((s) => s.bullets).slice(0, 3);

  return (
    <div
      className="card-enhanced"
      style={{
        borderRadius: 16,
        padding: "16px 18px 18px",
        border: "1px dashed rgba(37, 99, 235, 0.38)",
        background: "var(--color-surface, #fff)",
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
          marginBottom: 8,
        }}
      >
        Enterprise
      </span>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px", color: "var(--color-text)", letterSpacing: "-0.02em" }}>
        {plan.name}
      </h2>
      <p style={{ fontSize: 12.5, color: "var(--color-text-muted)", margin: "0 0 12px", lineHeight: 1.45 }}>
        {plan.headline}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
        {chips.map((c) => (
          <span
            key={c}
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              padding: "4px 9px",
              borderRadius: 999,
              background: "rgba(37, 99, 235, 0.08)",
              color: "var(--color-text)",
              border: "1px solid rgba(37, 99, 235, 0.14)",
              lineHeight: 1.35,
            }}
          >
            {c}
          </span>
        ))}
      </div>
      {plan.footnote ? (
        <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 12px", lineHeight: 1.45 }}>{plan.footnote}</p>
      ) : null}
      <div style={{ marginTop: "auto" }}>
        <Link
          href="/contact"
          className="btn-primary"
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            padding: "10px 14px",
            borderRadius: 11,
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          Contact sales
        </Link>
      </div>
    </div>
  );
}

export default function SalesCopilotPricingSection({
  variant,
  intro,
  pageTitle = "Plans & upgrade",
  enableCheckout = true,
}: SalesCopilotPricingSectionProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [billingHint, setBillingHint] = useState<string | null>(null);
  const [currentBillingPlanKey, setCurrentBillingPlanKey] = useState<string | null>(null);
  const { setup, tiers, custom } = useMemo(() => pricingPlansByLayout(), []);

  useEffect(() => {
    if (variant !== "portal") return;
    const read = () => {
      const raw = getUser()?.billing_plan_key;
      const k = typeof raw === "string" ? raw.trim() : "";
      setCurrentBillingPlanKey(k || null);
    };
    read();
    window.addEventListener("sparkai:user-changed", read);
    return () => window.removeEventListener("sparkai:user-changed", read);
  }, [variant]);

  const handlePortalCta = useCallback(
    async (plan: SalesCopilotPricingPlan) => {
      setBillingHint(null);
      setBusyId(plan.id);
      try {
        const res = (await apiRequest("/billing/checkout-session", {
          method: "POST",
          body: JSON.stringify({ planId: plan.id }),
        })) as {
          checkoutAvailable?: boolean;
          url?: string;
          message?: string;
        };
        if (res?.url) {
          window.location.href = res.url;
          return;
        }
        setBillingHint(res?.message || "Checkout will be available once billing is fully configured.");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Could not start checkout.";
        setBillingHint(msg);
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  const handleMarketingCta = useCallback(
    (plan: SalesCopilotPricingPlan) => {
      if (plan.kind === "custom") {
        router.push("/contact");
        return;
      }
      router.push("/auth/signup");
    },
    [router]
  );

  const handleLandingCta = (plan: SalesCopilotPricingPlan) => {
    if (plan.kind === "custom") {
      router.push("/contact");
      return;
    }
    router.push("/auth/signup");
  };

  if (variant === "landing") {
    const setupBullets = setup.sections.flatMap((s) => s.bullets);
    const customChips = custom.sections.flatMap((s) => s.bullets).slice(0, 3);

    return (
      <section className="pricing-section" id="pricing">
        <div className="section-header">
          <div className="section-badge">
            <Icons.Sparkles size={14} />
            Pricing
          </div>
          <h2 className="section-title">Outriva Plans</h2>
          <p className="section-subtitle">
            Start with one-time setup. Then choose a monthly tier or the calling add-on. Enterprise teams can go custom.
            Card payments will run on Stripe when checkout is enabled.
          </p>
        </div>

        <div className="scp-pricing-layout">
          <div className="scp-top-row">
            <div className="pricing-card scp-setup-top">
              <div className="scp-setup-top-kicker">Step 1 · Required first</div>
              <h3 className="scp-setup-top-name">{setup.name}</h3>
              <p className="scp-setup-top-lead">
                {setup.headline} All monthly plans and add-ons below unlock after this setup.
              </p>
              <div className="scp-setup-top-price">
                <span className="pricing-amount scp-setup-top-amount">{setup.priceDisplay}</span>
                {setup.priceSub ? <span className="pricing-period">{setup.priceSub}</span> : null}
              </div>
              <div className="scp-setup-top-list">
                {setupBullets.map((b) => (
                  <div key={b} className="pricing-feature scp-setup-top-li">
                    <span className="pricing-feature-icon">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span className="pricing-feature-text">{b}</span>
                  </div>
                ))}
              </div>
              {setup.footnote ? <p className="scp-setup-top-foot">{setup.footnote}</p> : null}
              <button
                type="button"
                className="pricing-cta pricing-cta-primary scp-setup-top-cta"
                onClick={() => handleLandingCta(setup)}
              >
                Get started
              </button>
            </div>

            <div className="pricing-card scp-custom-top">
              <div className="scp-custom-top-kicker">Enterprise</div>
              <h3 className="scp-custom-top-name">{custom.name}</h3>
              <p className="scp-custom-top-lead">{custom.headline}</p>
              <div className="scp-custom-top-chips">
                {customChips.map((c) => (
                  <span key={c} className="scp-custom-chip">
                    {c}
                  </span>
                ))}
              </div>
              {custom.footnote ? <p className="scp-custom-top-foot">{custom.footnote}</p> : null}
              <button
                type="button"
                className="pricing-cta pricing-cta-secondary scp-custom-top-cta"
                onClick={() => handleLandingCta(custom)}
              >
                Talk to sales
              </button>
            </div>
          </div>

          <p className="scp-tier-section-label">Monthly plans & add-ons</p>

          <div className="scp-tier-grid">
            {tiers.map((plan) => (
              <div
                key={plan.id}
                className={`pricing-card scp-tier-card${plan.featured ? " featured" : ""}`}
              >
                {plan.badge && <div className="pricing-badge">{plan.badge}</div>}
                <div className="pricing-header scp-tier-header">
                  <h3 className="pricing-name">{plan.name}</h3>
                  <p className="pricing-tagline">{plan.headline}</p>
                  <div className="pricing-price">
                    <span className="pricing-amount">{plan.priceDisplay}</span>
                    {plan.priceSub ? <span className="pricing-period">{plan.priceSub}</span> : null}
                  </div>
                  {typeof plan.leadQuota === "number" && (
                    <p className="pricing-highlight-sub" style={{ marginTop: 10, textAlign: "center" }}>
                      {plan.leadQuota} enriched leads / month
                    </p>
                  )}
                </div>
                <div className="pricing-features">
                  {plan.sections.map((sec) => (
                    <div key={sec.heading}>
                      <div className="pricing-features-title">{sec.heading}</div>
                      {sec.bullets.map((b) => (
                        <div key={b} className="pricing-feature">
                          <span className="pricing-feature-icon">
                            <Check size={12} strokeWidth={3} />
                          </span>
                          <span className="pricing-feature-text">{b}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {plan.footnote ? <p className="pricing-note" style={{ marginBottom: 14 }}>{plan.footnote}</p> : null}
                <button
                  type="button"
                  className={`pricing-cta ${plan.featured ? "pricing-cta-primary" : "pricing-cta-secondary"}`}
                  onClick={() => handleLandingCta(plan)}
                >
                  Get started
                </button>
              </div>
            ))}
          </div>
        </div>

        <p className="pricing-enterprise-note" style={{ maxWidth: 720, margin: "32px auto 0" }}>
          All amounts are in AED. Calling replaces the standard setup fee when purchased. Stripe Checkout is wired on the
          server—map Stripe Price IDs to each plan when you are ready.
        </p>
      </section>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto" }}>
      {(pageTitle || intro) ? (
        <div style={{ marginBottom: 24 }}>
          {pageTitle ? (
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 8px", color: "var(--color-text)" }}>
              {pageTitle}
            </h1>
          ) : null}
          {intro ? (
            <p style={{ fontSize: 15, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.6, maxWidth: 720 }}>
              {intro}
            </p>
          ) : null}
        </div>
      ) : null}
      {enableCheckout && billingHint && (
        <div
          role="status"
          style={{
            marginBottom: 20,
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(37, 99, 235, 0.08)",
            border: "1px solid rgba(37, 99, 235, 0.25)",
            fontSize: 14,
            color: "var(--color-text)",
          }}
        >
          {billingHint}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div className="scp-portal-top-row">
          <PortalSetupPairCard
            plan={setup}
            busyId={busyId}
            onCta={handlePortalCta}
            enableCheckout={enableCheckout}
            onMarketingCta={handleMarketingCta}
          />
          <PortalCustomPairCard plan={custom} />
        </div>

        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
            margin: "4px 0 0",
          }}
        >
          Monthly plans & add-ons
        </p>

        <div className="scp-portal-tier-grid">
          {tiers.map((plan) => (
            <PortalPlanCard
              key={plan.id}
              plan={plan}
              busyId={busyId}
              onCta={handlePortalCta}
              enableCheckout={enableCheckout}
              onMarketingCta={handleMarketingCta}
              compact
              isCurrentPlan={Boolean(currentBillingPlanKey && plan.id === currentBillingPlanKey)}
            />
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 24, lineHeight: 1.5 }}>
        Secured by Stripe when checkout is live. Until then, use{" "}
        <Link href="/contact" style={{ color: "#2563EB", fontWeight: 600 }}>
          Contact
        </Link>{" "}
        for enterprise or custom quotes.
      </p>
    </div>
  );
}
