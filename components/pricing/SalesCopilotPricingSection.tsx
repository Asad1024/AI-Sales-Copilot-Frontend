"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Info } from "lucide-react";
import { Icons } from "@/components/ui/Icons";
import {
  pricingPlansByLayout,
  type SalesCopilotPricingPlan,
} from "@/lib/salesCopilotPricing";
import { apiRequest, getUser } from "@/lib/apiClient";
import { RevealOnView } from "@/components/ui/RevealOnView";

type Variant = "landing" | "portal";

type SalesCopilotPricingSectionProps = {
  variant: Variant;
  intro?: string | null;
  pageTitle?: string;
  enableCheckout?: boolean;
};

function planFeatureBullets(plan: SalesCopilotPricingPlan): string[] {
  return plan.sections.flatMap((s) => s.bullets);
}

function SetupFeeBanner({ amountLabel }: { amountLabel: string }) {
  return (
    <div className="scp-setup-fee-banner" role="note">
      <div className="scp-setup-fee-banner-icon-wrap" aria-hidden>
        <Info className="scp-setup-fee-banner-icon" size={20} strokeWidth={2} />
      </div>
      <div className="scp-setup-fee-banner-body">
        <span className="scp-setup-fee-banner-label">One-time setup</span>
        <p className="scp-setup-fee-banner-text">
          <strong className="scp-setup-fee-banner-strong">{amountLabel}</strong> setup on every plan (onboarding and workspace).
        </p>
      </div>
    </div>
  );
}

function LandingPricingTierCard({
  plan,
  onCta,
}: {
  plan: SalesCopilotPricingPlan;
  onCta: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const bullets = planFeatureBullets(plan);
  const visible = showAll ? bullets : bullets.slice(0, 4);
  const hasMore = bullets.length > 4;
  const featured = Boolean(plan.featured);

  return (
    <RevealOnView
      className={`pricing-card scp-tier-card${featured ? " featured scp-pro-tier" : ""}`}
    >
      {plan.badge ? <div className="pricing-badge">{plan.badge}</div> : null}
      <div className="pricing-header scp-tier-header">
        <h3 className="pricing-name">{plan.name}</h3>
        <p className="pricing-tagline">{plan.headline}</p>
        <div className="pricing-price scp-price-block">
          <span className="pricing-amount scp-price-line">{plan.priceDisplay}</span>
          {plan.priceSub ? (
            <span className="pricing-period scp-price-below">{plan.priceSub.trim()}</span>
          ) : null}
        </div>
        {typeof plan.leadQuota === "number" ? (
          <p className="pricing-highlight-sub" style={{ marginTop: 10, textAlign: "center" }}>
            {plan.leadQuota} enriched leads / month
          </p>
        ) : null}
      </div>
      <div className="pricing-features">
        {visible.map((b) => (
          <div key={b} className="pricing-feature">
            <span className="pricing-feature-icon">
              <Check size={12} strokeWidth={3} />
            </span>
            <span className="pricing-feature-text">{b}</span>
          </div>
        ))}
        {hasMore ? (
          <button
            type="button"
            className="scp-features-toggle"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
          >
            {showAll ? "See fewer features" : "See all features"}
          </button>
        ) : null}
      </div>
      {plan.footnote ? <p className="pricing-note" style={{ marginBottom: 14 }}>{plan.footnote}</p> : null}
      <button
        type="button"
        className={`pricing-cta ${featured ? "pricing-cta-primary" : "pricing-cta-secondary"}`}
        onClick={onCta}
      >
        Get started
      </button>
    </RevealOnView>
  );
}

function LandingCallingAddonRow({
  plan,
  onCta,
}: {
  plan: SalesCopilotPricingPlan;
  onCta: () => void;
}) {
  return (
    <RevealOnView className="scp-calling-banner scp-landing-extra-card">
      <div className="scp-calling-banner-inner">
        <div className="scp-calling-banner-icon-wrap" aria-hidden>
          <Icons.Phone size={22} strokeWidth={2} />
        </div>
        <div className="scp-calling-banner-text">
          <p className="scp-calling-banner-label">Want AI Voice Calling?</p>
          <p className="scp-calling-banner-desc">Outbound AI calling as a core channel.</p>
        </div>
        <div className="scp-calling-banner-price-block">
          <span className="scp-calling-banner-amount">{plan.priceDisplay}</span>
          {plan.priceSub ? <span className="scp-calling-banner-sub">{plan.priceSub}</span> : null}
        </div>
        <button type="button" className="pricing-cta pricing-cta-primary scp-calling-banner-cta" onClick={onCta}>
          Add to Plan
        </button>
      </div>
    </RevealOnView>
  );
}

function LandingEnterpriseRow({ onCta }: { onCta: () => void }) {
  return (
    <RevealOnView className="scp-calling-banner scp-landing-extra-card">
      <div className="scp-calling-banner-inner">
        <div className="scp-calling-banner-icon-wrap" aria-hidden>
          <Icons.Briefcase size={22} strokeWidth={2} />
        </div>
        <div className="scp-calling-banner-text">
          <p className="scp-calling-banner-label">Enterprise</p>
          <p className="scp-calling-banner-desc">Custom volume, workflows, and integrations.</p>
        </div>
        <button type="button" className="pricing-cta pricing-cta-secondary scp-calling-banner-cta" onClick={onCta}>
          Contact Sales
        </button>
      </div>
    </RevealOnView>
  );
}

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
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const isCustom = plan.kind === "custom";
  const flatBullets = !isCustom ? planFeatureBullets(plan) : [];
  const visibleBullets = showAllFeatures ? flatBullets : flatBullets.slice(0, 4);
  const hasFeatureToggle = !isCustom && flatBullets.length > 4;
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
      className={`card-enhanced${plan.featured ? " scp-portal-pro-tier" : ""}`}
      style={{
        padding: plan.badge ? pad + 8 : pad,
        borderRadius: 20,
        border: plan.featured ? "2px solid var(--color-primary, #2563EB)" : "1px solid var(--color-border, #e5e7eb)",
        background: plan.featured
          ? "linear-gradient(165deg, color-mix(in srgb, var(--color-primary, #2563eb) 10%, transparent) 0%, color-mix(in srgb, var(--color-accent, #06b6d4) 6%, transparent) 100%)"
          : "var(--color-surface, #fff)",
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        position: "relative",
        height: "100%",
        transform: plan.featured ? "translateY(-8px) scale(1.02)" : undefined,
        boxShadow: plan.featured ? "var(--elev-shadow-lg, 0 12px 24px rgba(2, 6, 23, 0.12))" : undefined,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {plan.badge && (
        <span
          style={{
            position: "absolute",
            ...(plan.featured
              ? { top: -11, left: "50%", transform: "translateX(-50%)" }
              : { top: 12, right: 12 }),
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            padding: "5px 12px",
            borderRadius: 999,
            background: "linear-gradient(135deg, var(--color-primary, #2563EB) 0%, var(--color-accent, #06B6D4) 100%)",
            color: "#fff",
            whiteSpace: "nowrap",
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
          textAlign: plan.featured ? "center" : undefined,
          width: "100%",
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
          textAlign: plan.featured ? "center" : undefined,
        }}
      >
        {plan.headline}
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: plan.featured ? "center" : "flex-start",
          gap: 4,
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: priceSize, fontWeight: 800, color: "var(--color-primary, #2563EB)" }}>
          {plan.priceDisplay}
        </span>
        {plan.priceSub ? (
          <span style={{ fontSize: compact ? 12 : 13, color: "var(--color-text-muted)" }}>
            {plan.priceSub.trim()}
          </span>
        ) : null}
      </div>
      {typeof plan.leadQuota === "number" && (
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-text)",
            margin: "0 0 12px",
            textAlign: plan.featured ? "center" : undefined,
            width: "100%",
          }}
        >
          {plan.leadQuota} enriched leads / month
        </p>
      )}
      <div style={{ flex: 1, width: "100%" }}>
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
          {visibleBullets.map((b) => (
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
                style={{ flexShrink: 0, color: "var(--color-primary, #2563EB)", marginTop: 2 }}
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        {hasFeatureToggle ? (
          <button
            type="button"
            onClick={() => setShowAllFeatures((v) => !v)}
            style={{
              marginTop: 10,
              padding: 0,
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: compact ? 12 : 13,
              fontWeight: 600,
              color: "var(--color-primary, #2563EB)",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            {showAllFeatures ? "See fewer features" : "See all features"}
          </button>
        ) : null}
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

function PortalCallingAddonRow({
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
  return (
    <div
      className="card-enhanced scp-portal-calling-row"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "18px 20px",
        borderRadius: 16,
        border: "1px solid var(--color-border, #e5e7eb)",
        background: "var(--color-surface-secondary, #f1f5f9)",
      }}
    >
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 800, margin: "0 0 6px", color: "var(--color-text)" }}>Want AI Voice Calling?</p>
        <p style={{ fontSize: 12.5, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.45 }}>{plan.headline}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "var(--color-primary, #2563EB)" }}>{plan.priceDisplay}</span>
        {plan.priceSub ? (
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{plan.priceSub}</span>
        ) : null}
      </div>
      {enableCheckout ? (
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => onCta(plan)}
          style={{
            padding: "12px 20px",
            borderRadius: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.85 : 1,
          }}
        >
          {busy ? "Please wait…" : "Add to Plan"}
        </button>
      ) : (
        <button
          type="button"
          className="btn-primary"
          onClick={() => onMarketingCta(plan)}
          style={{ padding: "12px 20px", borderRadius: 12, fontWeight: 700, whiteSpace: "nowrap" }}
        >
          Add to Plan
        </button>
      )}
    </div>
  );
}

function PortalEnterpriseRow({ plan }: { plan: SalesCopilotPricingPlan }) {
  const chips = planFeatureBullets(plan).slice(0, 3);
  return (
    <div
      className="card-enhanced scp-portal-enterprise-row"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        padding: "22px 24px",
        borderRadius: 16,
        background: "var(--color-text, #0f172a)",
        color: "var(--color-text-inverse, #fff)",
        border: "1px solid color-mix(in srgb, var(--color-text-inverse, #fff) 14%, transparent)",
      }}
    >
      <div style={{ flex: "1 1 280px", minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            opacity: 0.75,
            marginBottom: 8,
          }}
        >
          Enterprise
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>{plan.name}</h2>
        <p style={{ fontSize: 13, opacity: 0.88, margin: "0 0 12px", lineHeight: 1.5 }}>{plan.headline}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {chips.map((c) => (
            <span
              key={c}
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                padding: "4px 9px",
                borderRadius: 999,
                background: "color-mix(in srgb, var(--color-text-inverse, #fff) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-text-inverse, #fff) 20%, transparent)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
        {plan.footnote ? (
          <p style={{ fontSize: 11, opacity: 0.75, margin: "12px 0 0", lineHeight: 1.45 }}>{plan.footnote}</p>
        ) : null}
      </div>
      <Link
        href="/contact"
        className="btn-primary"
        style={{
          display: "inline-flex",
          justifyContent: "center",
          padding: "12px 22px",
          borderRadius: 12,
          fontWeight: 700,
          textDecoration: "none",
          whiteSpace: "nowrap",
          background: "var(--color-surface, #fff)",
          color: "var(--color-text, #0f172a)",
          border: "none",
        }}
      >
        Contact Sales
      </Link>
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
  const { setup, tiers, custom, callingAddon } = useMemo(() => pricingPlansByLayout(), []);

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
    return (
      <section className="pricing-section scp-landing-pricing landing-strip landing-strip--b" id="pricing">
        <RevealOnView className="section-header scp-landing-pricing-head">
          <div className="section-badge">
            <Icons.Sparkles size={14} />
            Pricing
          </div>
          <h2 className="section-title">Outriva Plans</h2>
          <p className="section-subtitle scp-landing-pricing-lead">
            Choose a tier, add voice anytime, or go Enterprise. Stripe handles billing.
          </p>
        </RevealOnView>

        <div className="scp-pricing-layout">
          <SetupFeeBanner amountLabel={setup.priceDisplay} />

          <div className="scp-tier-grid">
            {tiers.map((plan) => (
              <LandingPricingTierCard key={plan.id} plan={plan} onCta={() => handleLandingCta(plan)} />
            ))}
          </div>

          <div className="scp-landing-extras">
            <LandingCallingAddonRow plan={callingAddon} onCta={() => handleLandingCta(callingAddon)} />
            <LandingEnterpriseRow onCta={() => handleLandingCta(custom)} />
          </div>
        </div>
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
        <SetupFeeBanner amountLabel={setup.priceDisplay} />

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

        <PortalCallingAddonRow
          plan={callingAddon}
          busyId={busyId}
          onCta={handlePortalCta}
          enableCheckout={enableCheckout}
          onMarketingCta={handleMarketingCta}
        />

        <PortalEnterpriseRow plan={custom} />
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
