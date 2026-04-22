"use client";

import { useState, useEffect, useMemo, Suspense, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { Icons } from "@/components/ui/Icons";
import { useSearchParams, useRouter } from "next/navigation";
import { apiRequest, getUser, setUser, type User } from "@/lib/apiClient";
import { shouldHideBillingAndUpgrade } from "@/lib/billingUi";
import { useBaseStore } from "@/stores/useBaseStore";
import { TestConfigurationSection } from "./TestConfigurationSection";
import { TestEmailSection } from "./TestEmailSection";
import BaseCard from "@/components/ui/BaseCard";
import { ProfileSettingsPanel } from "./ProfileSettingsPanel";
import { PaymentSettingsPanel } from "./PaymentSettingsPanel";
import { CreditHistorySettingsPanel } from "./CreditHistorySettingsPanel";
import { CreditCard, Coins } from "lucide-react";

/** Match `components/ui/Sidebar.tsx` nav links: 16px icon, stroke 1.5 */
const navIconBox = { width: 16, height: 16, display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const };
const ACTIVE_NAV_BG = "var(--sidebar-active-nav-bg)";
/** Must contrast primary fill — same as app `Sidebar.tsx` (was primary-on-primary → invisible). */
const ACTIVE_NAV_TEXT = "#ffffff";
const ACTIVE_NAV_ACCENT = "#ffffff";

const UserIcon = ({ active }: { active: boolean }) => (
  <span style={{ ...navIconBox, color: active ? ACTIVE_NAV_ACCENT : "var(--sidebar-nav-icon)" }}>
    <Icons.User size={16} strokeWidth={1.5} />
  </span>
);
const TestConfigTabIcon = ({ active }: { active: boolean }) => (
  <span style={{ ...navIconBox, color: active ? ACTIVE_NAV_ACCENT : "var(--sidebar-nav-icon)" }}>
    <Icons.Zap size={16} strokeWidth={1.5} />
  </span>
);
const TestEmailTabIcon = ({ active }: { active: boolean }) => (
  <span style={{ ...navIconBox, color: active ? ACTIVE_NAV_ACCENT : "var(--sidebar-nav-icon)" }}>
    <Icons.Mail size={16} strokeWidth={1.5} />
  </span>
);
const PaymentsTabIcon = ({ active }: { active: boolean }) => (
  <span style={{ ...navIconBox, color: active ? ACTIVE_NAV_ACCENT : "var(--sidebar-nav-icon)" }}>
    <CreditCard size={16} strokeWidth={1.5} />
  </span>
);
const CreditHistoryTabIcon = ({ active }: { active: boolean }) => (
  <span style={{ ...navIconBox, color: active ? ACTIVE_NAV_ACCENT : "var(--sidebar-nav-icon)" }}>
    <Coins size={16} strokeWidth={1.5} />
  </span>
);

type SettingsTabId =
  | "profile"
  | "payments"
  | "credit-history"
  | "test-configuration"
  | "test-email";

function parseSettingsTab(raw: string | null): SettingsTabId {
  if (raw === "payments" || raw === "billing") return "payments";
  if (raw === "credit-history" || raw === "credits") return "credit-history";
  if (raw === "safety") return "profile";
  if (raw === "test-configuration") return "test-configuration";
  if (raw === "test-email") return "test-email";
  return "profile";
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userRev, setUserRev] = useState(0);
  const bases = useBaseStore((s) => s.bases);
  const basesLoading = useBaseStore((s) => s.loading);

  useEffect(() => {
    const sync = () => setUserRev((n) => n + 1);
    window.addEventListener("sparkai:user-changed", sync);
    return () => window.removeEventListener("sparkai:user-changed", sync);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const me = (await apiRequest("/auth/me")) as { user: User };
        if (me?.user) {
          setUser(me.user);
          setUserRev((n) => n + 1);
        }
      } catch {
        /* offline / stale tab — keep cached user */
      }
    })();
  }, []);

  const hidePaymentsTab = useMemo(() => {
    const u = getUser();
    return u ? shouldHideBillingAndUpgrade(u, bases, basesLoading) : false;
  }, [userRev, bases, basesLoading]);

  const [tab, setTab] = useState<SettingsTabId>(() => parseSettingsTab(searchParams?.get("tab")));

  useEffect(() => {
    setTab(parseSettingsTab(searchParams?.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    if (!hidePaymentsTab) return;
    if (tab !== "payments") return;
    setTab("profile");
    const p = new URLSearchParams(searchParams?.toString() || "");
    p.set("tab", "profile");
    p.delete("session_id");
    router.replace(`/settings?${p.toString()}`);
  }, [hidePaymentsTab, tab, router, searchParams]);

  const selectTab = (id: SettingsTabId) => {
    setTab(id);
    const p = new URLSearchParams(searchParams?.toString() || "");
    p.set("tab", id);
    if (id !== "payments") p.delete("session_id");
    router.replace(`/settings?${p.toString()}`);
  };

  type TabDef = {
    id: SettingsTabId;
    label: string;
    hint: string;
    icon: (active: boolean) => ReactNode;
  };

  const settingsGroups: { category: string; items: TabDef[] }[] = useMemo(
    () => [
      {
        category: "Account",
        items: [
          { id: "profile", label: "Account & Settings", hint: "Identity, password & account", icon: (a) => <UserIcon active={a} /> },
        ],
      },
      {
        category: "Workspace",
        items: [
          { id: "payments", label: "Plan & Billing", hint: "Stripe receipts & plan", icon: (a) => <PaymentsTabIcon active={a} /> },
          {
            id: "credit-history",
            label: "Credits & Usage",
            hint: "Shared workspace credits & who spent them",
            icon: (a) => <CreditHistoryTabIcon active={a} />,
          },
        ],
      },
      {
        category: "Tools",
        items: [
          { id: "test-configuration", label: "Integration Tests", hint: "LinkedIn, WhatsApp, call", icon: (a) => <TestConfigTabIcon active={a} /> },
          { id: "test-email", label: "Email Tests", hint: "Send tests and see delivery & opens", icon: (a) => <TestEmailTabIcon active={a} /> },
        ],
      },
    ],
    []
  );

  const visibleSettingsGroups = useMemo(() => {
    if (!hidePaymentsTab) return settingsGroups;
    return settingsGroups.map((g) =>
      g.category === "Workspace"
        ? {
            ...g,
            items: g.items.filter((item) => item.id !== "payments"),
          }
        : g
    );
  }, [hidePaymentsTab, settingsGroups]);

  const effectiveTab: SettingsTabId = hidePaymentsTab && tab === "payments" ? "profile" : tab;

  const groupLabelStyle: CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.06em",
    color: "var(--sidebar-label)",
    textTransform: "uppercase",
    padding: "0 11px",
    marginBottom: 8,
    marginTop: 2,
    fontFamily: "Inter, sans-serif",
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "min(1400px, 100%)",
        margin: "0 auto",
        padding: "8px 0 40px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 260px) 1fr",
          gap: 28,
          alignItems: "start",
          marginTop: 8,
        }}
        className="settings-layout-grid"
      >
        <nav
          aria-label="Settings sections"
          className="settings-nav flex flex-col gap-0 sticky top-4"
        >
          {visibleSettingsGroups.map((group, groupIndex) => (
            <div
              key={group.category}
              className="settings-nav-group"
              style={{ marginTop: groupIndex === 0 ? 0 : 22 }}
            >
              <div style={groupLabelStyle}>{group.category}</div>
              {group.items.map(({ id, label, hint, icon }) => {
                const active = effectiveTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectTab(id)}
                    className="settings-nav-item w-full border-0 text-left"
                    data-active={active ? "true" : "false"}
                    title={hint}
                    aria-current={active ? "page" : undefined}
                    aria-label={`${label}. ${hint}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      minHeight: active ? 44 : 42,
                      padding: active ? "12px 14px" : "10px 12px",
                      boxSizing: "border-box",
                      border: active ? "1px solid #DE8850" : "1px solid transparent",
                      borderRadius: 12,
                      cursor: "pointer",
                      fontSize: 15,
                      fontWeight: active ? 600 : 500,
                      fontFamily: "Inter, sans-serif",
                      color: active ? ACTIVE_NAV_TEXT : "var(--sidebar-nav-text)",
                      background: active ? ACTIVE_NAV_BG : "transparent",
                      transition: "background 150ms ease, color 150ms ease, border-color 150ms ease, min-height 150ms ease",
                      marginBottom: 10,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "var(--sidebar-nav-hover-bg)";
                        e.currentTarget.style.color = "var(--sidebar-nav-hover-text)";
                        e.currentTarget.style.borderColor = "transparent";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--sidebar-nav-text)";
                        e.currentTarget.style.borderColor = "transparent";
                      } else {
                        e.currentTarget.style.background = ACTIVE_NAV_BG;
                        e.currentTarget.style.color = ACTIVE_NAV_TEXT;
                        e.currentTarget.style.borderColor = "#DE8850";
                      }
                    }}
                  >
                    <span style={{ display: "inline-flex", flexShrink: 0 }}>{icon(active)}</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          <div style={{ marginTop: 20, padding: "0 11px" }}>
            <Link
              href="/settings/chart-gallery"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-primary)",
                textDecoration: "none",
              }}
            >
              Chart gallery (22 types, dummy data) →
            </Link>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6, lineHeight: 1.4 }}>
              Visual reference for KPI-style charts used across the app.
            </div>
          </div>
        </nav>

        <BaseCard
          style={{
            borderRadius: 16,
            padding: effectiveTab === "payments" || effectiveTab === "credit-history" ? 24 : 22,
            minHeight: 400,
            border: "1px solid var(--color-border)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          }}
        >
          {effectiveTab === "profile" && <ProfileSettingsPanel />}
          {effectiveTab === "payments" && (
            <Suspense fallback={<p style={{ color: "var(--color-text-muted)" }}>Loading…</p>}>
              <PaymentSettingsPanel />
            </Suspense>
          )}
          {effectiveTab === "credit-history" && <CreditHistorySettingsPanel />}
          {effectiveTab === "test-configuration" && <TestConfigurationSection />}
          {effectiveTab === "test-email" && <TestEmailSection />}
        </BaseCard>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (max-width: 820px) {
          .settings-layout-grid { grid-template-columns: 1fr !important; }
          .settings-nav { position: static !important; flex-direction: column !important; flex-wrap: nowrap !important; gap: 0 !important; }
          .settings-nav .settings-nav-group { margin-top: 12px !important; width: 100%; }
          .settings-nav .settings-nav-group:first-child { margin-top: 0 !important; }
          .settings-nav button.settings-nav-item { flex: none !important; width: 100%; min-width: 0; margin-bottom: 4px !important; }
        }
      `,
        }}
      />
    </div>
  );
}
