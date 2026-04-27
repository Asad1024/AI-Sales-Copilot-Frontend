"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, ExternalLink, Settings, CreditCard, UsersRound, Puzzle, BarChart3, CircleHelp, LogOut, Rocket, Coins } from "lucide-react";
import { getUser, apiRequest, clearAuth } from "@/lib/apiClient";
import { shouldHideBillingAndUpgrade } from "@/lib/billingUi";
import { useBase } from "@/context/BaseContext";
import { useBaseStore } from "@/stores/useBaseStore";
import ThemeToggle from "@/components/ui/ThemeToggle";

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
  const creditsPopoverCloseTimer = useRef<number | null>(null);
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
      setMonthlyCredits(Number(u?.monthly_lead_credits ?? 0));
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
    const onCreditsChanged = (event: Event) => {
      const custom = event as CustomEvent<{ baseId?: number | null }>;
      const changedBaseId = custom?.detail?.baseId;
      if (changedBaseId == null || activeBaseId == null || Number(changedBaseId) === Number(activeBaseId)) {
        void syncCredits();
      }
    };
    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") void syncCredits();
    };
    if (typeof window === "undefined") return;
    window.addEventListener("sparkai:user-changed", onUser);
    window.addEventListener("sparkai:active-base-changed", onBase);
    window.addEventListener("sparkai:workspace-credits-changed", onCreditsChanged as EventListener);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("sparkai:user-changed", onUser);
      window.removeEventListener("sparkai:active-base-changed", onBase);
      window.removeEventListener("sparkai:workspace-credits-changed", onCreditsChanged as EventListener);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [activeBaseId, syncCredits]);

  useEffect(() => {
    return () => {
      if (creditsPopoverCloseTimer.current != null) {
        window.clearTimeout(creditsPopoverCloseTimer.current);
        creditsPopoverCloseTimer.current = null;
      }
    };
  }, []);

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

  /** Workspace pool from API — never invent a default (expired / free plans should show 0, not 100). */
  const creditsTotal = Math.max(0, monthlyCredits);
  const creditsUsed =
    creditsTotal > 0 ? Math.max(0, creditsTotal - Math.max(0, Number(credits) || 0)) : 0;
  const creditProgress =
    creditsTotal > 0 ? Math.min(100, Math.max(0, Math.round((creditsUsed / creditsTotal) * 100))) : 0;
  const remainingCredits = Math.max(0, Number(credits || 0));
  const remainingCreditsLabel = remainingCredits.toLocaleString();
  const openCreditsPopover = () => {
    if (creditsPopoverCloseTimer.current != null) {
      window.clearTimeout(creditsPopoverCloseTimer.current);
      creditsPopoverCloseTimer.current = null;
    }
    setWalletOpen(true);
  };
  const closeCreditsPopoverSoon = () => {
    if (creditsPopoverCloseTimer.current != null) {
      window.clearTimeout(creditsPopoverCloseTimer.current);
    }
    creditsPopoverCloseTimer.current = window.setTimeout(() => {
      setWalletOpen(false);
      creditsPopoverCloseTimer.current = null;
    }, 120);
  };
  const nextAllowanceLabel = useMemo(() => {
    if (creditsTotal <= 0) return null;
    const u = getUser();
    const iso = u?.billing_expires_at;
    if (iso) {
      const dt = new Date(iso);
      if (!Number.isNaN(dt.getTime())) {
        return dt.toLocaleString(undefined, {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      }
    }
    const d = new Date();
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 5, 0);
    return next.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [creditsTotal, userRev]);

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
        <div
          style={{ position: "relative" }}
          onMouseEnter={openCreditsPopover}
          onMouseLeave={closeCreditsPopoverSoon}
        >
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
              border: "1px solid var(--color-primary)",
              color: "#ffffff",
              background: "var(--color-primary)",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
            }}
            onFocus={openCreditsPopover}
            onBlur={closeCreditsPopoverSoon}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-primary)";
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.borderColor = "var(--color-primary)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(var(--color-primary-rgb), 0.22)";
              e.currentTarget.style.transform = "translateY(-1px)";
              openCreditsPopover();
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--color-primary)";
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.borderColor = "var(--color-primary)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
              closeCreditsPopoverSoon();
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span>Upgrade</span>
            </span>
            <span aria-hidden style={{ opacity: 0.55, fontWeight: 500 }}>
              |
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1,
                color: "#ffffff",
                background: "transparent",
                border: "none",
                borderRadius: 0,
                padding: 0,
              }}
            >
              <Coins size={14} strokeWidth={2} />
              {remainingCreditsLabel}
            </span>
          </Link>
          {walletOpen && (
            <div
              onMouseEnter={openCreditsPopover}
              onMouseLeave={closeCreditsPopoverSoon}
              style={{
                position: "absolute",
                right: 0,
                top: 42,
                width: "min(360px, calc(100vw - 16px))",
                maxWidth: "calc(100vw - 16px)",
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

              {creditsTotal > 0 ? (
                <>
                  <div style={{ fontSize: 13, color: "var(--color-text)", marginBottom: 8 }}>
                    {creditsUsed} of {creditsTotal} credits used
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 10 }}>
                    Remaining credits:{" "}
                    <strong style={{ color: "var(--color-text)" }}>{Math.max(0, credits)}</strong>
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
                  {nextAllowanceLabel ? (
                    <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 12 }}>
                      Next allowance update: {nextAllowanceLabel}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: "var(--color-text)", marginBottom: 8 }}>
                    Remaining credits:{" "}
                    <strong style={{ color: "var(--color-text)" }}>{Math.max(0, credits)}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                    Your plan does not include a monthly lead credit pool right now. Upgrade or renew to get credits.
                  </div>
                </>
              )}

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
                  background: "var(--color-primary)",
                  color: "#fff",
                }}
              >
                Get more credits
              </Link>
            </div>
          )}
        </div>
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
                background: "rgba(var(--color-primary-rgb), 0.2)",
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
                    borderRadius: 8,
                    background: "var(--color-primary)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1.15,
                    whiteSpace: "nowrap",
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
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  textDecoration: "none",
                  color: "#fff",
                  border: "1px solid color-mix(in srgb, var(--color-primary) 88%, #000)",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      background: "rgba(255,255,255,0.2)",
                      border: "1px solid rgba(255,255,255,0.35)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    <Rocket size={15} strokeWidth={1.85} color="#fff" />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.15 }}>Upgrade Account</span>
                </span>
                <span
                  style={{
                    background: "rgba(255,255,255,0.22)",
                    color: "#fff",
                    borderRadius: 9999,
                    padding: "4px 9px",
                    fontSize: 10,
                    fontWeight: 600,
                    lineHeight: 1.15,
                    letterSpacing: "0.01em",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {planLabel} Account
                </span>
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
                href="/help"
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
