"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet, Bell, ChevronDown, ExternalLink, Settings, CreditCard, UsersRound, Puzzle, BarChart3, CircleHelp, LogOut, Rocket } from "lucide-react";
import { getUser, apiRequest, clearAuth } from "@/lib/apiClient";
import { shouldHideBillingAndUpgrade } from "@/lib/billingUi";
import { useBase } from "@/context/BaseContext";
import { useBaseStore } from "@/stores/useBaseStore";
import ThemeToggle from "@/components/ui/ThemeToggle";

function UpgradeSparkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M7.2 2.4l1.64 4.16L13 8.2l-4.16 1.64L7.2 14 5.56 9.84 1.4 8.2l4.16-1.64L7.2 2.4z" />
      <path d="M16.8 10.2l.99 2.51 2.51.99-2.51.99-.99 2.51-.99-2.51-2.51-.99 2.51-.99.99-2.51z" />
    </svg>
  );
}

/** Same outer height for tutorial pill and credits / upgrade pill */
const HEADER_PILL_HEIGHT = 40;
const headerPillBox: CSSProperties = {
  boxSizing: "border-box",
  minHeight: HEADER_PILL_HEIGHT,
  height: HEADER_PILL_HEIGHT,
  borderRadius: 10,
  border: "1px solid var(--header-pill-border)",
  background: "var(--header-pill-bg)",
  fontFamily: "Inter, -apple-system, sans-serif",
};

type HeaderTopRightPillsProps = {
  showDashboardTutorial?: boolean;
};

export default function HeaderTopRightPills({ showDashboardTutorial = false }: HeaderTopRightPillsProps) {
  const router = useRouter();
  const { activeBaseId } = useBase();
  const bases = useBaseStore((s) => s.bases);
  const basesLoading = useBaseStore((s) => s.loading);
  const [userRev, setUserRev] = useState(0);
  const [credits, setCredits] = useState<number>(() => getUser()?.credits_balance ?? 0);
  const [monthlyCredits, setMonthlyCredits] = useState<number>(0);
  const [walletOpen, setWalletOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const walletRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const user = getUser();
  const planLabel = (() => {
    const key = (user?.billing_plan_key || "").trim();
    if (!key) return "Free";
    return key
      .replace(/[_-]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");
  })();
  const userDisplayName = (user?.name || "").trim() || (user?.email || "User");
  const userInitials = (user?.name || user?.email || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
        monthly_lead_credits?: number;
      };
      setCredits(Number(data?.credits_balance ?? 0));
      setMonthlyCredits(Number(data?.monthly_lead_credits ?? 0));
    } catch {
      setCredits(u?.credits_balance ?? 0);
      setMonthlyCredits(0);
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

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (!walletRef.current) return;
      if (!walletRef.current.contains(event.target as Node)) setWalletOpen(false);
    };
    if (walletOpen) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [walletOpen]);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    };
    if (userMenuOpen) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userMenuOpen]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!userMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [userMenuOpen]);

  const creditsUsed = Math.max(0, monthlyCredits - credits);
  const creditsTotal = monthlyCredits > 0 ? monthlyCredits : 100;
  const creditProgress = Math.min(100, Math.max(0, Math.round((creditsUsed / Math.max(1, creditsTotal)) * 100)));
  const nextReset = (() => {
    const d = new Date();
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 5, 0);
    return next.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  })();

  return (
    <div
      className="header-top-right-pills"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}
    >
      {!hideUpgrade ? (
        <Link
          href="/upgrade"
          style={{
            ...headerPillBox,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            height: 34,
            minHeight: 34,
            borderRadius: 10,
            padding: "0 12px",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--color-primary)",
            background: "rgba(37, 99, 235, 0.08)",
            textDecoration: "none",
            transition: "background 0.15s ease, color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-primary)";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(37, 99, 235, 0.08)";
            e.currentTarget.style.color = "var(--color-primary)";
          }}
        >
          <UpgradeSparkIcon size={16} />
          Upgrade
        </Link>
      ) : null}

      <div
        style={{
          width: 2,
          height: 24,
          background: "var(--header-pill-divider)",
          margin: "0 6px",
          borderRadius: 2,
          opacity: 0.9,
        }}
        aria-hidden
      />

      <ThemeToggle />

      <Link
        href="/notifications"
        aria-label="Notifications"
        style={{
          width: 34,
          height: 34,
          borderRadius: 9999,
          border: "none",
          background: "var(--header-pill-bg)",
          color: "var(--color-text-muted)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
        }}
      >
        <Bell size={17} strokeWidth={1.85} />
      </Link>

      <div ref={walletRef} style={{ position: "relative" }}>
        <button
          type="button"
          title={activeBaseId ? "Credits for the active workspace (owner’s pool)" : "Your account credits"}
          onClick={() => setWalletOpen((v) => !v)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 9999,
            border: "none",
            background: "var(--header-pill-bg)",
            color: "var(--color-text-muted)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Wallet size={17} strokeWidth={1.8} />
        </button>
        {walletOpen && (
          <div
            style={{
              position: "absolute",
              right: -36,
              top: 42,
              width: 360,
              maxWidth: "min(360px, 88vw)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              boxShadow: "0 12px 36px rgba(15, 23, 42, 0.16)",
              padding: 16,
              zIndex: 80,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
                fontSize: 15,
                fontWeight: 500,
                color: "var(--color-text)",
              }}
            >
              <span>Account credits</span>
              <Link href="/settings?tab=credits" style={{ color: "var(--color-text-muted)" }} onClick={() => setWalletOpen(false)}>
                <ExternalLink size={17} strokeWidth={1.8} />
              </Link>
            </div>

            <div style={{ height: 1, background: "var(--color-border)", marginBottom: 12 }} />

            <div style={{ fontSize: 13, color: "var(--color-text)", marginBottom: 8 }}>
              {creditsUsed} of {creditsTotal} credits used
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 10 }}>
              Remaining credits: <strong style={{ color: "var(--color-text)" }}>{Math.max(0, credits)}</strong>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 9999,
                background: "var(--color-surface-secondary)",
                overflow: "hidden",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: `${creditProgress}%`,
                  height: "100%",
                  background: "var(--color-primary)",
                }}
              />
            </div>

            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 12 }}>
              Next credit reset: {nextReset}
            </div>

            <div style={{ height: 1, background: "var(--color-border)", marginBottom: 12 }} />

            <Link
              href="/upgrade"
              onClick={() => setWalletOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: 42,
                borderRadius: 10,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 500,
                background: "rgba(37, 99, 235, 0.12)",
                color: "var(--color-primary)",
              }}
            >
              Get more credits
            </Link>
          </div>
        )}
      </div>

      <div ref={userMenuRef} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setUserMenuOpen((v) => !v)}
          style={{
            ...headerPillBox,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "0 10px 0 6px",
            color: "var(--color-text)",
            minWidth: 0,
            border: "1px solid transparent",
            cursor: "pointer",
            transition: "border-color 0.15s ease, background 0.15s ease",
          }}
          aria-haspopup="menu"
          aria-expanded={userMenuOpen}
          title="Account menu"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#d1d5db";
            e.currentTarget.style.background = "var(--color-surface-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "transparent";
            e.currentTarget.style.background = "var(--header-pill-bg)";
          }}
        >
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt=""
              referrerPolicy="no-referrer"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
                border: "1px solid var(--color-border)",
              }}
            />
          ) : (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: "rgba(37, 99, 235, 0.12)",
                color: "var(--color-primary)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
              aria-hidden
            >
              {userInitials}
            </div>
          )}
          <ChevronDown size={14} strokeWidth={1.8} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
        </button>
        {userMenuOpen ? (
          <div
            role="menu"
            style={{
              position: "absolute",
              right: -24,
              top: 46,
              width: 324,
              maxWidth: "min(324px, 92vw)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              boxShadow: "0 14px 40px rgba(15, 23, 42, 0.16)",
              padding: 12,
              zIndex: 90,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 6px" }}>
              {user?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt=""
                  referrerPolicy="no-referrer"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1px solid var(--color-border)",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    background: "rgba(244, 63, 94, 0.1)",
                    color: "#ef4444",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  {userInitials}
                </div>
              )}
              <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", lineHeight: 1.1, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
                  {userDisplayName}
                </span>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 9,
                    background: "rgba(37, 99, 235, 0.12)",
                    color: "var(--color-primary)",
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: 1.05,
                  }}
                >
                  {planLabel}
                </span>
              </div>
            </div>

            {!hideUpgrade ? (
              <Link
                href="/upgrade"
                onClick={() => setUserMenuOpen(false)}
                style={{
                  marginTop: 6,
                  marginBottom: 8,
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: "rgba(37, 99, 235, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  textDecoration: "none",
                  color: "var(--color-primary)",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 9, background: "#fff", border: "1px solid rgba(37,99,235,0.18)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <Rocket size={15} strokeWidth={1.8} />
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.1 }}>Upgrade Account</span>
                </span>
                <span style={{ background: "rgba(37, 99, 235, 0.14)", color: "var(--color-primary)", borderRadius: 9999, padding: "5px 10px", fontSize: 12, fontWeight: 600, lineHeight: 1 }}>{planLabel} Account</span>
              </Link>
            ) : null}

            <div style={{ height: 1, background: "var(--color-border)", margin: "6px 2px 8px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "4px 2px" }}>
              {[
                { label: "Account & Settings", href: "/settings", icon: Settings },
                { label: "Plan & Billing", href: "/settings?tab=payments", icon: CreditCard },
                { label: "Team Management", href: "/team", icon: UsersRound },
                { label: "Integration", href: "/integration", icon: Puzzle },
                { label: "Analytics", href: "/reports", icon: BarChart3 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      borderRadius: 10,
                      padding: "10px 10px",
                      textDecoration: "none",
                      color: "var(--color-text)",
                      fontSize: 13,
                      fontWeight: 500,
                      lineHeight: 1.25,
                    }}
                  >
                    <Icon size={18} strokeWidth={1.9} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div style={{ height: 1, background: "var(--color-border)", margin: "8px 2px 8px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "4px 2px" }}>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: 10,
                  padding: "10px 10px",
                  textDecoration: "none",
                  color: "var(--color-text)",
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: 1.25,
                }}
              >
                <CircleHelp size={18} strokeWidth={1.9} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                <span>Help &amp; Support</span>
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  clearAuth();
                  setUserMenuOpen(false);
                  router.push("/auth/login");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: 10,
                  padding: "10px 10px",
                  border: "none",
                  background: "transparent",
                  color: "#dc2626",
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: 1.25,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <LogOut size={18} strokeWidth={1.9} style={{ color: "#dc2626", flexShrink: 0 }} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
