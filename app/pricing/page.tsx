"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SalesCopilotPricingSection from "@/components/pricing/SalesCopilotPricingSection";

export default function PricingPage() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, var(--color-background) 0%, var(--color-surface) 100%)",
        padding: "40px 24px 80px",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <header
          style={{
            padding: "20px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <div
              style={{
                height: "52px",
                width: "52px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, var(--color-primary) 0%, #F29F67 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
              </svg>
            </div>
            <span
              style={{
                fontSize: "24px",
                fontWeight: "700",
                background: "linear-gradient(135deg, var(--color-primary) 0%, #F29F67 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Leads Reach
            </span>
          </Link>
          <div style={{ display: "flex", gap: "12px" }}>
            <button type="button" onClick={() => router.push("/auth/login")} className="btn-ghost">
              Log in
            </button>
            <button type="button" onClick={() => router.push("/auth/signup")} className="btn-primary">
              Get started
            </button>
          </div>
        </header>

        <SalesCopilotPricingSection
          variant="portal"
          enableCheckout={false}
          pageTitle="Leads Reach pricing"
          intro="All prices in AED. Setup is one-time; monthly plans include enriched lead quotas and omni-channel outreach. Calling replaces the standard setup fee when enabled."
        />

        <div style={{ maxWidth: "800px", margin: "48px auto 0" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "700", textAlign: "center", marginBottom: "32px" }}>
            Frequently asked questions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              {
                q: "How does billing work?",
                a: "Checkout is powered by Stripe. Until API keys and Stripe Price IDs are configured, use Contact sales for purchases.",
              },
              {
                q: "Can I change plans later?",
                a: "Yes. Upgrades and downgrades will be supported through the portal once subscriptions are connected to Stripe.",
              },
              {
                q: "What is the calling add-on?",
                a: "It is a 10,000 AED one-time setup that replaces the standard 2,000 AED setup and enables AI calling plus advanced multi-channel workflows.",
              },
            ].map((faq, i) => (
              <div key={i} className="card-enhanced" style={{ padding: "24px" }}>
                <h4 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px 0" }}>{faq.q}</h4>
                <p style={{ fontSize: "15px", color: "var(--color-text-muted)", margin: 0 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
