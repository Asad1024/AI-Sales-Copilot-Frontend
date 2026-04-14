"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Coins } from "lucide-react";
import { getUser, apiRequest } from "@/lib/apiClient";
import { shouldHideBillingAndUpgrade } from "@/lib/billingUi";
import { useBase } from "@/context/BaseContext";
import { useBaseStore } from "@/stores/useBaseStore";
import { dispatchStartDashboardTour } from "@/lib/dashboardTour";

/** Same outer height for tutorial pill and credits / upgrade pill */
const HEADER_PILL_HEIGHT = 40;
const headerPillBox: CSSProperties = {
  boxSizing: "border-box",
  minHeight: HEADER_PILL_HEIGHT,
  height: HEADER_PILL_HEIGHT,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fafafa",
  fontFamily: "Inter, -apple-system, sans-serif",
};

type HeaderTopRightPillsProps = {
  /** Tutorial pill is only shown on `/dashboard` and replays the dashboard product tour. */
  showDashboardTutorial?: boolean;
};

export default function HeaderTopRightPills({ showDashboardTutorial = false }: HeaderTopRightPillsProps) {
  const { activeBaseId } = useBase();
  const bases = useBaseStore((s) => s.bases);
  const basesLoading = useBaseStore((s) => s.loading);
  const [userRev, setUserRev] = useState(0);
  const [credits, setCredits] = useState<number>(() => getUser()?.credits_balance ?? 0);

  const hideUpgrade = useMemo(() => {
    const u = getUser();
    return u ? shouldHideBillingAndUpgrade(u, bases, basesLoading) : true;
  }, [userRev, bases, basesLoading]);

  const syncCredits = useCallback(async () => {
    const u = getUser();
    if (!activeBaseId) {
      setCredits(u?.credits_balance ?? 0);
      return;
    }
    try {
      const data = (await apiRequest(`/bases/${activeBaseId}/workspace-credits?page=1&limit=1`)) as {
        credits_balance?: number;
      };
      setCredits(Number(data?.credits_balance ?? 0));
    } catch {
      setCredits(u?.credits_balance ?? 0);
    }
  }, [activeBaseId]);

  useEffect(() => {
    void syncCredits();
  }, [syncCredits]);

  useEffect(() => {
    const onUser = () => {
      setUserRev((n) => n + 1);
      void syncCredits();
    };
    const onBase = () => void syncCredits();
    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") void syncCredits();
    };
    if (typeof window === "undefined") return;
    window.addEventListener("sparkai:user-changed", onUser);
    window.addEventListener("sparkai:active-base-changed", onBase);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("sparkai:user-changed", onUser);
      window.removeEventListener("sparkai:active-base-changed", onBase);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [syncCredits]);

  return (
    <div
      className="header-top-right-pills"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
      }}
    >
      {showDashboardTutorial ? (
        <button
          type="button"
          className="header-top-right-pills__tutorial"
          aria-label="Replay dashboard tutorial"
          style={{
            ...headerPillBox,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 14px",
            cursor: "pointer",
            border: "1px solid #C7D2FE",
            background: "#EEF2FF",
          }}
          onClick={() => dispatchStartDashboardTour()}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#E0E7FF";
            e.currentTarget.style.borderColor = "#A5B4FC";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#EEF2FF";
            e.currentTarget.style.borderColor = "#C7D2FE";
          }}
        >
          <BookOpen size={18} strokeWidth={1.75} color="#4F46E5" aria-hidden />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#4F46E5" }}>Tutorial</span>
        </button>
      ) : null}

      <div
        className="header-top-right-pills__credits"
        style={{
          ...headerPillBox,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 12px 0 8px",
        }}
        title={activeBaseId ? "Credits for the active workspace (owner’s pool)" : "Your account credits"}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: "#fef3c7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-hidden
        >
          <Coins size={15} strokeWidth={1.75} color="#d97706" />
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#b45309", minWidth: 28, lineHeight: 1 }}>{credits}</span>
        {!hideUpgrade ? (
          <>
            <div
              style={{
                width: 1,
                height: 18,
                background: "#e5e7eb",
                flexShrink: 0,
              }}
              aria-hidden
            />
            <Link
              href="/upgrade"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: "0 2px",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-primary, #7C3AED)",
                fontFamily: "inherit",
                lineHeight: 1,
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#6D28D9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--color-primary, #7C3AED)";
              }}
            >
              Upgrade
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
