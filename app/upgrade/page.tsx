"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, getUser, setUser, type User } from "@/lib/apiClient";
import { shouldBlockUpgradeRoute } from "@/lib/billingUi";
import { useBaseStore } from "@/stores/useBaseStore";
import SalesCopilotPricingSection from "@/components/pricing/SalesCopilotPricingSection";
import LandingMarketingNav from "@/components/landing/LandingMarketingNav";
import "./upgrade-page.css";

type AccessPhase = "loading" | "blocked" | "ok";

export default function UpgradePage() {
  const router = useRouter();
  const bases = useBaseStore((s) => s.bases);
  const basesLoading = useBaseStore((s) => s.loading);
  const [phase, setPhase] = useState<AccessPhase>("loading");
  const [appearance, setAppearance] = useState<"light" | "dark">("light");

  const decide = useCallback(() => {
    const u = getUser();
    if (!u) {
      setPhase("loading");
      return;
    }
    if (u.restrict_billing_ui === true) {
      router.replace("/dashboard");
      setPhase("blocked");
      return;
    }
    if (u.restrict_billing_ui === false) {
      setPhase("ok");
      return;
    }
    const d = shouldBlockUpgradeRoute(u, bases, basesLoading);
    if (d === true) {
      router.replace("/dashboard");
      setPhase("blocked");
      return;
    }
    if (d === null) {
      setPhase("loading");
      return;
    }
    setPhase("ok");
  }, [router, bases, basesLoading]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = (await apiRequest("/auth/me")) as { user: User };
        if (cancelled) return;
        if (me?.user) setUser(me.user);
      } catch {
        /* use cached user */
      } finally {
        if (!cancelled) decide();
      }
    })();
    const onUser = () => decide();
    window.addEventListener("sparkai:user-changed", onUser);
    return () => {
      cancelled = true;
      window.removeEventListener("sparkai:user-changed", onUser);
    };
  }, [decide]);

  useEffect(() => {
    decide();
  }, [decide]);

  const toggleAppearance = useCallback(() => {
    setAppearance((v) => (v === "light" ? "dark" : "light"));
  }, []);

  if (phase === "loading" || phase === "blocked") {
    return (
      <div
        className="upgrade-fullpage landing-page landing-theme-light"
        style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}
      >
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
          {phase === "blocked" ? "Redirecting…" : "Loading…"}
        </p>
      </div>
    );
  }

  return (
    <div className={`upgrade-fullpage landing-page${appearance === "light" ? " landing-theme-light" : ""}`}>
      <LandingMarketingNav
        cta="dashboard"
        appearance={appearance}
        onToggleAppearance={toggleAppearance}
        links="app"
        showLogin={false}
      />
      <main className="upgrade-fullpage__main">
        <header className="upgrade-fullpage__hero">
          <p className="upgrade-fullpage__kicker">Pricing</p>
          <h1 className="upgrade-fullpage__title">Fuel your pipeline, your way</h1>
          <p className="upgrade-fullpage__lead">
            Straight AED pricing and credits you can grow into—upgrade the moment your pipeline pulls ahead.
          </p>
        </header>
        <SalesCopilotPricingSection variant="upgrade" pageTitle="" intro="" />
      </main>
    </div>
  );
}
