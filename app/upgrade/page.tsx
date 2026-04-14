"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, getUser, setUser, type User } from "@/lib/apiClient";
import { shouldBlockUpgradeRoute } from "@/lib/billingUi";
import { useBaseStore } from "@/stores/useBaseStore";
import SalesCopilotPricingSection from "@/components/pricing/SalesCopilotPricingSection";

type AccessPhase = "loading" | "blocked" | "ok";

export default function UpgradePage() {
  const router = useRouter();
  const bases = useBaseStore((s) => s.bases);
  const basesLoading = useBaseStore((s) => s.loading);
  const [phase, setPhase] = useState<AccessPhase>("loading");

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

  if (phase === "loading" || phase === "blocked") {
    return (
      <div style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="text-hint" style={{ fontSize: 14 }}>
          {phase === "blocked" ? "Redirecting…" : "Loading…"}
        </p>
      </div>
    );
  }

  return <SalesCopilotPricingSection variant="portal" pageTitle="" intro="" />;
}
