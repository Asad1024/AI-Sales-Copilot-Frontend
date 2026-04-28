"use client";
import Link from "next/link";
import { APP_BRAND_LOGO_HEIGHT, APP_BRAND_LOGO_MAX_WIDTH, AppBrandLogoLockup } from "@/components/ui/AppBrandLogo";
import LandingMarketingNav from "@/components/landing/LandingMarketingNav";
import { isAuthenticated } from "@/lib/apiClient";
import "../upgrade/upgrade-page.css";

export default function AboutPage() {
  const authed = isAuthenticated();
  return (
    <div
      className={!authed ? "upgrade-fullpage landing-page landing-theme-light" : undefined}
      style={
        authed
          ? {
              minHeight: "100vh",
              background: "linear-gradient(180deg, var(--color-background) 0%, var(--color-surface) 100%)",
              padding: "28px 24px 80px",
            }
          : undefined
      }
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {!authed ? (
          <LandingMarketingNav
            cta="signup"
            appearance="light"
            onToggleAppearance={() => {
              /* no-op (About uses fixed light appearance) */
            }}
            links="marketing"
            showLogin
          />
        ) : null}

        {!authed ? (
          <div style={{ paddingTop: "calc(var(--landing-nav-clearance, 7.5rem) + 18px)" }} />
        ) : null}

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <h1
            style={{
              fontSize: "clamp(36px, 6vw, 56px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              margin: "0 0 16px 0",
              background: "linear-gradient(135deg, var(--color-primary) 0%, #F29F67 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            About Leads Reach
          </h1>
          <p
            style={{
              fontSize: 18,
              color: "var(--color-text-muted)",
              maxWidth: 820,
              margin: "0 auto",
              lineHeight: 1.75,
            }}
          >
            Leads Reach is an AI-powered outreach platform that helps teams find the right accounts, generate qualified leads,
            and run multi‑channel campaigns — with everything organized inside a workspace built for modern sales.
          </p>
        </div>

        {/* At-a-glance */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
            margin: "34px 0 54px",
          }}
        >
          {[
            { label: "Multi‑channel", value: "Email · LinkedIn · WhatsApp · AI calling" },
            { label: "Lead engine", value: "AI lead generation + enrichment + scoring" },
            { label: "Workspace‑first", value: "Team access · seats · permissions · auditability" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="card-enhanced"
              style={{
                padding: 18,
                borderRadius: 18,
                border: "1px solid rgba(148, 163, 184, 0.28)",
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                {stat.label}
              </div>
              <div style={{ marginTop: 10, fontSize: 16, fontWeight: 750, color: "var(--color-text)", lineHeight: 1.35 }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* What we are */}
        <div className="card-enhanced" style={{ padding: 44, marginBottom: 44, borderRadius: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 28, alignItems: "start" }}>
            <div>
              <h2 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 14px 0", letterSpacing: "-0.02em" }}>
                What Leads Reach is
              </h2>
              <p style={{ fontSize: 16, color: "var(--color-text-muted)", lineHeight: 1.8, margin: 0 }}>
                Leads Reach is your end‑to‑end outbound workspace: build target lists, enrich contacts, run campaigns across channels,
                and track performance — all in one place. It’s designed to remove manual busywork so your team can focus on conversations
                and pipeline.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: "2px 0 12px 0" }}>Built for teams that need</h3>
              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--color-text-muted)", lineHeight: 1.75, fontSize: 15 }}>
                <li>Consistent list building and enrichment without spreadsheet chaos.</li>
                <li>Repeatable outreach workflows across channels.</li>
                <li>Visibility into what’s working (and what isn’t) at the campaign level.</li>
                <li>A workspace model that supports roles, seats, and shared resources.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div style={{ marginBottom: 54 }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, textAlign: "center", margin: "0 0 18px 0", letterSpacing: "-0.02em" }}>
            How it works
          </h2>
          <p style={{ textAlign: "center", margin: "0 auto 26px", maxWidth: 820, color: "var(--color-text-muted)", lineHeight: 1.75, fontSize: 16 }}>
            A simple flow: define your ICP, generate or import leads, enrich + score, then launch multi‑channel outreach and track results.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {[
              {
                step: "01",
                title: "Define your ICP",
                desc: "Describe your ideal customer. We translate it into structured search and targeting signals.",
              },
              {
                step: "02",
                title: "Generate & enrich",
                desc: "Create new leads with AI or import from CSV/Sheets/CRM. Enrich profiles and validate contact fields.",
              },
              {
                step: "03",
                title: "Run campaigns",
                desc: "Launch sequences across channels and measure replies, conversions, and performance over time.",
              },
            ].map((row) => (
              <div key={row.step} className="card-enhanced" style={{ padding: 22, borderRadius: 20 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.16em", color: "rgba(var(--color-primary-rgb), 0.9)" }}>
                    STEP {row.step}
                  </div>
                </div>
                <h3 style={{ margin: "10px 0 8px", fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>{row.title}</h3>
                <p style={{ margin: 0, fontSize: 14.5, color: "var(--color-text-muted)", lineHeight: 1.7 }}>{row.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div style={{ marginBottom: 54 }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, textAlign: "center", marginBottom: 22, letterSpacing: "-0.02em" }}>
            Our values
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                title: "Innovation",
                desc: "We push what AI can do for outbound — without making workflows fragile or opaque.",
                icon: "💡",
              },
              {
                title: "Simplicity",
                desc: "Powerful doesn’t need to feel complicated. We design for speed and clarity.",
                icon: "✨",
              },
              {
                title: "Transparency",
                desc: "Clear limits, clear billing, and clear controls. Your team stays in charge.",
                icon: "🔍",
              },
              {
                title: "Results",
                desc: "Everything ships with one goal: more qualified conversations and pipeline.",
                icon: "🎯",
              },
            ].map((value) => (
              <div key={value.title} className="card-enhanced" style={{ padding: 26, borderRadius: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>{value.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px 0", letterSpacing: "-0.01em" }}>{value.title}</h3>
                <p style={{ fontSize: 14.5, color: "var(--color-text-muted)", lineHeight: 1.7, margin: 0 }}>{value.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust / privacy note */}
        <div
          className="card-enhanced"
          style={{
            padding: 32,
            marginBottom: 54,
            borderRadius: 22,
            background: "linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.12) 0%, rgba(15, 23, 42, 0.02) 55%, rgba(var(--color-primary-rgb), 0.08) 100%)",
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 10px 0", letterSpacing: "-0.02em" }}>Built for real‑world sales teams</h2>
          <p style={{ margin: 0, color: "var(--color-text-muted)", lineHeight: 1.75, fontSize: 15.5 }}>
            We’re focused on reliability, predictable limits, and workspace controls that make it easy to collaborate. Whether you’re
            a solo founder or a multi‑rep team, Leads Reach is designed to scale with your outbound motion.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
            {["Workspaces & roles", "Campaign analytics", "CRM-ready exports", "AI assist everywhere"].map((pill) => (
              <span
                key={pill}
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "rgba(15, 23, 42, 0.74)",
                  background: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(148,163,184,0.28)",
                  padding: "8px 10px",
                  borderRadius: 999,
                }}
              >
                {pill}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            textAlign: "center",
            padding: "54px 40px",
            background:
              "linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.22) 0%, rgba(var(--color-primary-rgb), 0.10) 100%)",
            borderRadius: 24,
          }}
        >
          <h2 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>
            Join Us on This Journey
          </h2>
          <p style={{ fontSize: 16.5, color: "var(--color-text-muted)", margin: "0 auto 22px", maxWidth: 720, lineHeight: 1.7 }}>
            Create a workspace, connect your stack, and start building pipeline with AI-assisted outreach.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/auth/signup" className="btn-primary" style={{ padding: "14px 22px", fontSize: 15 }}>
            Get Started Free
            </Link>
            <Link href="/pricing" className="btn-ghost" style={{ padding: "14px 22px", fontSize: 15 }}>
              View pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

