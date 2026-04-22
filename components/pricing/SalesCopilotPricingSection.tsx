"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Check, Info } from "lucide-react";
import { Icons } from "@/components/ui/Icons";
import {
  pricingPlansByLayout,
  subscriptionQuotaLine,
  type SalesCopilotPricingPlan,
} from "@/lib/salesCopilotPricing";
import { apiRequest, getUser, isAuthenticated } from "@/lib/apiClient";
import { RevealOnView } from "@/components/ui/RevealOnView";
import "./pricing-cards.css";
import "./landing-pricing-shell.css";

type Variant = "landing" | "portal" | "upgrade";

type SalesCopilotPricingSectionProps = {
  variant: Variant;
  intro?: string | null;
  pageTitle?: string;
  enableCheckout?: boolean;
};

function PricingPlanSections({
  plan,
  checkSize,
  workspaceAlign,
}: {
  plan: SalesCopilotPricingPlan;
  checkSize: number;
  workspaceAlign?: boolean;
}) {
  if (!plan.sections.length) return null;

  const renderSection = (section: SalesCopilotPricingPlan["sections"][number]) => (
    <section key={section.heading} className="scp-pc__block">
      <h4 className="scp-pc__blockTitle">{section.heading}</h4>
      <ul className="scp-pc__list" role="list">
        {section.bullets.map((line) => (
          <li key={line} className="scp-pc__item">
            <Check className="scp-pc__tick" size={checkSize} strokeWidth={2.25} aria-hidden />
            <span className="scp-pc__itemText">{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );

  if (workspaceAlign) {
    const wsIdx = plan.sections.findIndex((s) => /workspace/i.test(s.heading.trim()));
    if (wsIdx > 0) {
      const before = plan.sections.slice(0, wsIdx);
      const rest = plan.sections.slice(wsIdx);
      return (
        <div className="scp-pc__blocks scp-pc__blocks--workspace-align">
          <div className="scp-pc__beforeWorkspaceStretch">{before.map(renderSection)}</div>
          {rest.map(renderSection)}
        </div>
      );
    }
  }

  return <div className="scp-pc__blocks">{plan.sections.map(renderSection)}</div>;
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
  sessionActive,
  isCurrentPlan,
  tierRowReservesBadgePad = false,
}: {
  plan: SalesCopilotPricingPlan;
  onCta: () => void;
  sessionActive: boolean;
  isCurrentPlan: boolean;
  /** When any tier in the row shows a top badge, pad all wraps so card bodies line up. */
  tierRowReservesBadgePad?: boolean;
}) {
  const featured = Boolean(plan.featured);
  const quotaLine = subscriptionQuotaLine(plan);
  const isCustom = plan.kind === "custom";
  const badgeLabel = plan.badge?.trim();
  const tierTopPad = Boolean(badgeLabel) || tierRowReservesBadgePad;

  return (
    <RevealOnView
      className={`scp-tier-wrap pricing-card scp-tier-card scp-pricing-tier-card${tierTopPad ? " scp-tier-wrap--badged" : ""}`}
    >
      {badgeLabel ? (
        <span className="scp-tier-external-badge" aria-hidden="true">
          {badgeLabel}
        </span>
      ) : null}
      <div
        className={`scp-pc scp-pc--landing${featured ? " scp-pc--featured featured scp-pro-tier" : ""}${isCurrentPlan ? " scp-pc--current-plan" : ""}`}
        aria-current={isCurrentPlan ? "true" : undefined}
      >
      <header className="scp-pc__head">
        <h3 className="scp-pc__title">{plan.name}</h3>
        <p className="scp-pc__lead">{plan.headline}</p>
      </header>
      <div className="scp-pc__hero">
        {isCustom ? (
          <span className="scp-pc__amount scp-pc__amount--lg">{plan.priceDisplay}</span>
        ) : (
          <div className="scp-pc__priceRow">
            <span className="scp-pc__amount">{plan.priceDisplay}</span>
            {plan.priceSub ? <span className="scp-pc__period">{plan.priceSub.trim()}</span> : null}
          </div>
        )}
        {quotaLine ? <p className="scp-pc__quoteline">{quotaLine}</p> : null}
      </div>
      <PricingPlanSections plan={plan} checkSize={13} workspaceAlign={plan.kind === "subscription"} />
      <footer className="scp-pc__footer">
        {plan.footnote ? <p className="scp-pc__note">{plan.footnote}</p> : null}
        {isCurrentPlan ? (
          <div className="scp-pc__btn--ghost scp-pc__btn--current-foot" role="status">
            Current plan
          </div>
        ) : (
          <button
            type="button"
            className={`scp-pc__btn ${featured ? "scp-pc__btn--primary" : "scp-pc__btn--secondary"}`}
            onClick={onCta}
          >
            {sessionActive ? "Go to Dashboard" : "Get started"}
          </button>
        )}
      </footer>
      </div>
    </RevealOnView>
  );
}

/** Same card chrome as landing (`scp-pc--landing`); CTAs follow portal/checkout rules. */
function UpgradeTierCard({
  plan,
  busyId,
  enableCheckout,
  onCta,
  onMarketingCta,
  isCurrentPlan,
  tierRowReservesBadgePad = false,
}: {
  plan: SalesCopilotPricingPlan;
  busyId: string | null;
  enableCheckout: boolean;
  onCta: (plan: SalesCopilotPricingPlan) => void;
  onMarketingCta: (plan: SalesCopilotPricingPlan) => void;
  isCurrentPlan: boolean;
  tierRowReservesBadgePad?: boolean;
}) {
  const featured = Boolean(plan.featured);
  const quotaLine = subscriptionQuotaLine(plan);
  const isCustom = plan.kind === "custom";
  const busy = busyId === plan.id;
  const ctaLabel = enableCheckout
    ? isCustom
      ? "Contact sales"
      : "Choose plan"
    : isCustom
      ? "Contact sales"
      : "Get started";
  const badgeLabel = plan.badge?.trim();
  const tierTopPad = Boolean(badgeLabel) || tierRowReservesBadgePad;

  return (
    <RevealOnView
      className={`scp-tier-wrap pricing-card scp-tier-card scp-pricing-tier-card${tierTopPad ? " scp-tier-wrap--badged" : ""}`}
    >
      {badgeLabel ? (
        <span className="scp-tier-external-badge" aria-hidden="true">
          {badgeLabel}
        </span>
      ) : null}
      <div
        className={`scp-pc scp-pc--landing${featured ? " scp-pc--featured featured scp-pro-tier" : ""}${isCurrentPlan ? " scp-pc--current-plan" : ""}`}
        aria-current={isCurrentPlan ? "true" : undefined}
      >
      <header className="scp-pc__head">
        <h3 className="scp-pc__title">{plan.name}</h3>
        <p className="scp-pc__lead">{plan.headline}</p>
      </header>
      <div className="scp-pc__hero">
        {isCustom ? (
          <span className="scp-pc__amount scp-pc__amount--lg">{plan.priceDisplay}</span>
        ) : (
          <div className="scp-pc__priceRow">
            <span className="scp-pc__amount">{plan.priceDisplay}</span>
            {plan.priceSub ? <span className="scp-pc__period">{plan.priceSub.trim()}</span> : null}
          </div>
        )}
        {quotaLine ? <p className="scp-pc__quoteline">{quotaLine}</p> : null}
      </div>
      <PricingPlanSections plan={plan} checkSize={13} workspaceAlign={plan.kind === "subscription"} />
      <footer className="scp-pc__footer">
        {plan.footnote ? <p className="scp-pc__note">{plan.footnote}</p> : null}
        {isCustom ? (
          <Link href="/contact" className="scp-pc__btn scp-pc__btn--primary">
            {ctaLabel}
          </Link>
        ) : isCurrentPlan ? (
          <div className="scp-pc__btn--ghost scp-pc__btn--current-foot" role="status">
            Current plan
          </div>
        ) : enableCheckout ? (
          <button
            type="button"
            className={`scp-pc__btn ${featured ? "scp-pc__btn--primary" : "scp-pc__btn--secondary"}`}
            disabled={busy}
            onClick={() => onCta(plan)}
            style={{ cursor: busy ? "wait" : "pointer", opacity: busy ? 0.85 : 1 }}
          >
            {busy ? "Please wait…" : ctaLabel}
          </button>
        ) : (
          <button
            type="button"
            className={`scp-pc__btn ${featured ? "scp-pc__btn--primary" : "scp-pc__btn--secondary"}`}
            onClick={() => onMarketingCta(plan)}
          >
            {ctaLabel}
          </button>
        )}
      </footer>
      </div>
    </RevealOnView>
  );
}

function LandingCallingAddonRow({ plan }: { plan: SalesCopilotPricingPlan }) {
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
        <Link
          href="/contact"
          className="pricing-cta pricing-cta-primary scp-calling-banner-cta scp-pricing-contact-sales-cta"
        >
          Contact Sales
        </Link>
      </div>
    </RevealOnView>
  );
}

function LandingEnterpriseRow({ plan }: { plan: SalesCopilotPricingPlan }) {
  return (
    <RevealOnView className="scp-calling-banner scp-landing-extra-card">
      <div className="scp-calling-banner-inner">
        <div className="scp-calling-banner-icon-wrap" aria-hidden>
          <Icons.Briefcase size={22} strokeWidth={2} />
        </div>
        <div className="scp-calling-banner-text">
          <p className="scp-calling-banner-label">Enterprise</p>
          <p className="scp-calling-banner-desc">
            <span className="scp-landing-enterprise-name">{plan.name}</span>
            <span className="scp-landing-enterprise-sep"> · </span>
            {plan.headline}
          </p>
        </div>
        {plan.kind !== "custom" ? (
          <div className="scp-calling-banner-price-block">
            <span className="scp-calling-banner-amount">{plan.priceDisplay}</span>
            {plan.priceSub ? <span className="scp-calling-banner-sub">{plan.priceSub}</span> : null}
          </div>
        ) : null}
        <Link
          href="/contact"
          className="pricing-cta pricing-cta-primary scp-calling-banner-cta scp-pricing-contact-sales-cta"
        >
          Contact Sales
        </Link>
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
  tierRowReservesBadgePad = false,
}: {
  plan: SalesCopilotPricingPlan;
  busyId: string | null;
  onCta: (plan: SalesCopilotPricingPlan) => void;
  enableCheckout: boolean;
  onMarketingCta: (plan: SalesCopilotPricingPlan) => void;
  compact?: boolean;
  isCurrentPlan?: boolean;
  tierRowReservesBadgePad?: boolean;
}) {
  const isCustom = plan.kind === "custom";
  const quotaLine = subscriptionQuotaLine(plan);
  const ctaLabel = enableCheckout
    ? isCustom
      ? "Contact sales"
      : "Choose plan"
    : isCustom
      ? "Contact sales"
      : "Get started";
  const busy = busyId === plan.id;
  const featured = Boolean(plan.featured);
  const badgeLabel = plan.badge?.trim();
  const tierTopPad = Boolean(badgeLabel) || tierRowReservesBadgePad;

  return (
    <div className={`scp-tier-wrap${tierTopPad ? " scp-tier-wrap--badged" : ""}`}>
      {badgeLabel ? (
        <span className="scp-tier-external-badge" aria-hidden="true">
          {badgeLabel}
        </span>
      ) : null}
    <div
      className={`scp-pc scp-pc--app${featured ? " scp-pc--featured scp-portal-pro-tier" : ""}${isCurrentPlan ? " scp-pc--current-plan" : ""}`}
      data-density={compact ? "compact" : undefined}
      aria-current={isCurrentPlan ? "true" : undefined}
    >
      <header className="scp-pc__head">
        <h3 className="scp-pc__title">{plan.name}</h3>
        <p className="scp-pc__lead">{plan.headline}</p>
      </header>
      <div className="scp-pc__hero">
        {isCustom ? (
          <span className="scp-pc__amount scp-pc__amount--lg">{plan.priceDisplay}</span>
        ) : (
          <div className="scp-pc__priceRow">
            <span className="scp-pc__amount">{plan.priceDisplay}</span>
            {plan.priceSub ? <span className="scp-pc__period">{plan.priceSub.trim()}</span> : null}
          </div>
        )}
        {quotaLine ? <p className="scp-pc__quoteline">{quotaLine}</p> : null}
      </div>
      <PricingPlanSections plan={plan} checkSize={compact ? 12 : 13} workspaceAlign={plan.kind === "subscription"} />
      <footer className="scp-pc__footer">
        {plan.footnote ? <p className="scp-pc__note">{plan.footnote}</p> : null}
        {isCustom ? (
          <Link href="/contact" className="scp-pc__btn scp-pc__btn--primary">
            {ctaLabel}
          </Link>
        ) : isCurrentPlan ? (
          <div className="scp-pc__btn--ghost scp-pc__btn--current-foot" role="status">
            Current plan
          </div>
        ) : enableCheckout ? (
          <button
            type="button"
            className="scp-pc__btn scp-pc__btn--primary"
            disabled={busy}
            onClick={() => onCta(plan)}
            style={{ cursor: busy ? "wait" : "pointer", opacity: busy ? 0.85 : 1 }}
          >
            {busy ? "Please wait…" : ctaLabel}
          </button>
        ) : (
          <button type="button" className="scp-pc__btn scp-pc__btn--primary" onClick={() => onMarketingCta(plan)}>
            {ctaLabel}
          </button>
        )}
      </footer>
    </div>
    </div>
  );
}

function portalExtraRowBoxStyle(upgrade: boolean): CSSProperties | undefined {
  if (upgrade) return undefined;
  return {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "18px 20px",
    borderRadius: 16,
    border: "1px solid var(--color-border, #e5e7eb)",
    background: "var(--color-surface-secondary, #f1f5f9)",
  };
}

function PortalCallingAddonRow({ plan, upgrade = false }: { plan: SalesCopilotPricingPlan; upgrade?: boolean }) {
  return (
    <div
      className={`card-enhanced scp-portal-extra-row scp-portal-calling-row${upgrade ? " scp-upgrade-secondary-surface" : ""}`}
      style={portalExtraRowBoxStyle(upgrade)}
    >
      <div className="scp-portal-extra-row__body">
        <p className="scp-portal-extra-row__title">Want AI Voice Calling?</p>
        <p className="scp-portal-extra-row__desc">{plan.headline}</p>
      </div>
      <div className="scp-portal-extra-row__price">
        <span className="scp-portal-extra-row__amount">{plan.priceDisplay}</span>
        {plan.priceSub ? <span className="scp-portal-extra-row__sub">{plan.priceSub}</span> : null}
      </div>
      <Link
        href="/contact"
        className={`btn-primary scp-portal-extra-cta scp-pricing-contact-sales-cta${upgrade ? " scp-upgrade-row-cta" : ""}`}
        style={
          upgrade
            ? { display: "inline-flex", justifyContent: "center", textDecoration: "none", whiteSpace: "nowrap" }
            : {
                display: "inline-flex",
                justifyContent: "center",
                padding: "12px 20px",
                borderRadius: 12,
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }
        }
      >
        Contact Sales
      </Link>
    </div>
  );
}

function PortalEnterpriseRow({ plan, upgrade = false }: { plan: SalesCopilotPricingPlan; upgrade?: boolean }) {
  return (
    <div
      className={`card-enhanced scp-portal-extra-row scp-portal-enterprise-row${upgrade ? " scp-upgrade-secondary-surface" : ""}`}
      style={portalExtraRowBoxStyle(upgrade)}
    >
      <div className="scp-portal-extra-row__body">
        <p className="scp-portal-extra-row__title">Enterprise</p>
        <p className="scp-portal-extra-row__desc">
          <span className="scp-portal-extra-row__plan-name">{plan.name}</span>
          <span aria-hidden> · </span>
          {plan.headline}
        </p>
      </div>
      {plan.kind !== "custom" ? (
        <div className="scp-portal-extra-row__price">
          <span className="scp-portal-extra-row__amount">{plan.priceDisplay}</span>
          {plan.priceSub ? <span className="scp-portal-extra-row__sub">{plan.priceSub}</span> : null}
        </div>
      ) : null}
      <Link
        href="/contact"
        className={`btn-primary scp-portal-extra-cta scp-pricing-contact-sales-cta${upgrade ? " scp-upgrade-row-cta" : ""}`}
        style={
          upgrade
            ? { display: "inline-flex", justifyContent: "center", textDecoration: "none", whiteSpace: "nowrap" }
            : {
                display: "inline-flex",
                justifyContent: "center",
                padding: "12px 20px",
                borderRadius: 12,
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }
        }
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
  const [landingHasSession, setLandingHasSession] = useState(false);
  const { setup, tiers, custom, callingAddon } = useMemo(() => pricingPlansByLayout(), []);
  const tierRowReservesBadgePad = useMemo(() => tiers.some((p) => Boolean(p.badge?.trim())), [tiers]);

  useEffect(() => {
    if (variant !== "landing") return;
    const read = () => setLandingHasSession(isAuthenticated());
    read();
    window.addEventListener("sparkai:user-changed", read);
    return () => window.removeEventListener("sparkai:user-changed", read);
  }, [variant]);

  useEffect(() => {
    const read = () => {
      const raw = getUser()?.billing_plan_key;
      const k = typeof raw === "string" ? raw.trim() : "";
      setCurrentBillingPlanKey(k || null);
    };
    read();
    window.addEventListener("sparkai:user-changed", read);
    return () => window.removeEventListener("sparkai:user-changed", read);
  }, []);

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

  const handleLandingCta = useCallback(
    (plan: SalesCopilotPricingPlan) => {
      if (plan.kind === "custom") {
        router.push("/contact");
        return;
      }
      if (landingHasSession) {
        router.push("/dashboard");
        return;
      }
      router.push("/auth/signup");
    },
    [router, landingHasSession]
  );

  const isUpgrade = variant === "upgrade";

  if (variant === "landing") {
    return (
      <section className="pricing-section scp-landing-pricing landing-strip landing-strip--b" id="pricing">
        <RevealOnView className="section-header scp-landing-pricing-head">
          <div className="section-badge">Pricing</div>
          <h2 className="section-title">Fuel your pipeline, your way</h2>
          <p className="section-subtitle scp-landing-pricing-lead">
            Straight AED pricing and credits you can grow into—upgrade the moment your pipeline pulls ahead.
          </p>
        </RevealOnView>

        <div className="scp-pricing-layout">
          <SetupFeeBanner amountLabel={setup.priceDisplay} />

          <div className="scp-tier-grid">
            {tiers.map((plan) => (
              <LandingPricingTierCard
                key={plan.id}
                plan={plan}
                sessionActive={landingHasSession}
                isCurrentPlan={Boolean(currentBillingPlanKey && plan.id === currentBillingPlanKey)}
                tierRowReservesBadgePad={tierRowReservesBadgePad}
                onCta={() => handleLandingCta(plan)}
              />
            ))}
          </div>

          <div className="scp-landing-extras">
            <LandingCallingAddonRow plan={callingAddon} />
            <LandingEnterpriseRow plan={custom} />
          </div>
        </div>
      </section>
    );
  }

  const portalShellStyle: CSSProperties | undefined = isUpgrade
    ? undefined
    : { width: "100%", maxWidth: 1200, margin: "0 auto" };

  return (
    <div className={isUpgrade ? "scp-upgrade-pricing-root" : undefined} style={portalShellStyle}>
      {!isUpgrade && (pageTitle || intro) ? (
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
            marginBottom: isUpgrade ? 16 : 20,
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(var(--color-primary-rgb), 0.2)",
            border: "1px solid rgba(var(--color-primary-rgb), 0.2)",
            fontSize: 14,
            color: "var(--color-text)",
          }}
        >
          {billingHint}
        </div>
      )}

      {isUpgrade ? (
        <div className="scp-pricing-layout">
          <div className="scp-tier-grid">
            {tiers.map((plan) => (
              <UpgradeTierCard
                key={plan.id}
                plan={plan}
                busyId={busyId}
                onCta={handlePortalCta}
                enableCheckout={enableCheckout}
                onMarketingCta={handleMarketingCta}
                isCurrentPlan={Boolean(currentBillingPlanKey && plan.id === currentBillingPlanKey)}
                tierRowReservesBadgePad={tierRowReservesBadgePad}
              />
            ))}
          </div>
          <div className="scp-landing-extras">
            <LandingCallingAddonRow plan={callingAddon} />
            <LandingEnterpriseRow plan={custom} />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div className="scp-portal-tier-grid">
            {tiers.map((plan) => (
              <PortalPlanCard
                key={plan.id}
                plan={plan}
                tierRowReservesBadgePad={tierRowReservesBadgePad}
                busyId={busyId}
                onCta={handlePortalCta}
                enableCheckout={enableCheckout}
                onMarketingCta={handleMarketingCta}
                compact
                isCurrentPlan={Boolean(currentBillingPlanKey && plan.id === currentBillingPlanKey)}
              />
            ))}
          </div>

          <div className="scp-pricing-extras-grid">
            <PortalCallingAddonRow plan={callingAddon} upgrade={false} />
            <PortalEnterpriseRow plan={custom} upgrade={false} />
          </div>
        </div>
      )}

      {!isUpgrade ? (
        <p
          style={{
            fontSize: 12,
            color: "var(--color-text-muted)",
            marginTop: 24,
            lineHeight: 1.5,
          }}
        >
          Secured by Stripe when checkout is live. Until then, use{" "}
          <Link href="/contact" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
            Contact
          </Link>{" "}
          for enterprise or custom quotes.
        </p>
      ) : null}
    </div>
  );
}
