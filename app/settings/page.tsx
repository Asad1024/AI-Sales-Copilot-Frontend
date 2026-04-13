"use client";

import { useState, useEffect, Suspense, type CSSProperties, type ReactNode } from "react";
import { Icons } from "@/components/ui/Icons";
import { useSearchParams, useRouter } from "next/navigation";
import { TestConfigurationSection } from "./TestConfigurationSection";
import { IntegrationsHub } from "./IntegrationsHub";
import BaseCard from "@/components/ui/BaseCard";
import { ProfileSettingsPanel } from "./ProfileSettingsPanel";
import { PaymentSettingsPanel } from "./PaymentSettingsPanel";
import { CreditHistorySettingsPanel } from "./CreditHistorySettingsPanel";
import { CreditCard, Coins } from "lucide-react";

/** Match `components/ui/Sidebar.tsx` nav links: 16px icon, stroke 1.5 */
const navIconBox = { width: 16, height: 16, display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const };
const ACTIVE_NAV_BG = "rgba(124, 58, 237, 0.09)";
const ACTIVE_NAV_TEXT = "#7C3AED";
const ACTIVE_NAV_ACCENT = "#7C3AED";

const UserIcon = ({ active }: { active: boolean }) => (
  <span style={{ ...navIconBox, color: active ? ACTIVE_NAV_ACCENT : "#6B7280" }}>
    <Icons.User size={16} strokeWidth={1.5} />
  </span>
);
const PlugTabIcon = ({ active }: { active: boolean }) => (
  <span style={{ ...navIconBox, color: active ? ACTIVE_NAV_ACCENT : "#6B7280" }}>
    <Icons.Plug size={16} strokeWidth={1.5} />
  </span>
);
const TestConfigTabIcon = ({ active }: { active: boolean }) => (
  <span style={{ ...navIconBox, color: active ? ACTIVE_NAV_ACCENT : "#6B7280" }}>
    <Icons.Zap size={16} strokeWidth={1.5} />
  </span>
);
const PaymentsTabIcon = ({ active }: { active: boolean }) => (
  <span style={{ ...navIconBox, color: active ? ACTIVE_NAV_ACCENT : "#6B7280" }}>
    <CreditCard size={16} strokeWidth={1.5} />
  </span>
);
const CreditHistoryTabIcon = ({ active }: { active: boolean }) => (
  <span style={{ ...navIconBox, color: active ? ACTIVE_NAV_ACCENT : "#6B7280" }}>
    <Coins size={16} strokeWidth={1.5} />
  </span>
);

type SettingsTabId = "profile" | "integrations" | "payments" | "credit-history" | "test-configuration";

function parseSettingsTab(raw: string | null): SettingsTabId {
  if (raw === "integrations" || raw === "connectors") return "integrations";
  if (raw === "payments" || raw === "billing") return "payments";
  if (raw === "credit-history" || raw === "credits") return "credit-history";
  if (raw === "safety") return "profile";
  if (raw === "test-configuration") return "test-configuration";
  return "profile";
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<SettingsTabId>(() => parseSettingsTab(searchParams?.get("tab")));

  useEffect(() => {
    setTab(parseSettingsTab(searchParams?.get("tab")));
  }, [searchParams]);

  const selectTab = (id: SettingsTabId) => {
    setTab(id);
    const p = new URLSearchParams(searchParams?.toString() || "");
    p.set("tab", id === "integrations" ? "integrations" : id);
    if (id !== "integrations") p.delete("connect");
    if (id !== "payments") p.delete("session_id");
    router.replace(`/settings?${p.toString()}`);
  };

  type TabDef = {
    id: SettingsTabId;
    label: string;
    hint: string;
    icon: (active: boolean) => ReactNode;
  };

  const settingsGroups: { category: string; items: TabDef[] }[] = [
    {
      category: "Account",
      items: [
        { id: "profile", label: "Profile", hint: "Identity, password & account", icon: (a) => <UserIcon active={a} /> },
      ],
    },
    {
      category: "Workspace",
      items: [
        { id: "integrations", label: "Integrations", hint: "CRM & messaging", icon: (a) => <PlugTabIcon active={a} /> },
        { id: "payments", label: "Payments", hint: "Stripe receipts & plan", icon: (a) => <PaymentsTabIcon active={a} /> },
        {
          id: "credit-history",
          label: "Credit history",
          hint: "Shared workspace credits & who spent them",
          icon: (a) => <CreditHistoryTabIcon active={a} />,
        },
      ],
    },
    {
      category: "Tools",
      items: [
        { id: "test-configuration", label: "Test configuration", hint: "Channels & SMTP", icon: (a) => <TestConfigTabIcon active={a} /> },
      ],
    },
  ];

  const groupLabelStyle: CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.06em",
    color: "#9CA3AF",
    textTransform: "uppercase",
    padding: "0 11px",
    marginBottom: 4,
    fontFamily: "Inter, sans-serif",
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "min(1400px, 100%)",
        margin: "0 auto",
        padding: "4px 0 32px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(200px, 240px) 1fr",
          gap: 16,
          alignItems: "start",
          marginTop: 4,
        }}
        className="settings-layout-grid"
      >
        <nav
          aria-label="Settings sections"
          className="settings-nav flex flex-col gap-0 sticky top-4"
        >
          {settingsGroups.map((group, groupIndex) => (
            <div
              key={group.category}
              className="settings-nav-group"
              style={{ marginTop: groupIndex === 0 ? 0 : 14 }}
            >
              <div style={groupLabelStyle}>{group.category}</div>
              {group.items.map(({ id, label, hint, icon }) => {
                const active = tab === id;
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
                      gap: 10,
                      minHeight: active ? 42 : 34,
                      padding: active ? "10px 14px" : "7px 11px",
                      boxSizing: "border-box",
                      borderLeft: active ? `3px solid ${ACTIVE_NAV_ACCENT}` : "3px solid transparent",
                      borderRadius: active ? 0 : 8,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: active ? 600 : 500,
                      fontFamily: "Inter, sans-serif",
                      color: active ? ACTIVE_NAV_TEXT : "#374151",
                      background: active ? ACTIVE_NAV_BG : "transparent",
                      transition: "background 150ms ease, color 150ms ease, min-height 150ms ease, border-radius 150ms ease",
                      marginBottom: 5,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "#F3F4F6";
                        e.currentTarget.style.color = "#111827";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#374151";
                      } else {
                        e.currentTarget.style.background = ACTIVE_NAV_BG;
                        e.currentTarget.style.color = ACTIVE_NAV_TEXT;
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
        </nav>

        <BaseCard
          style={{
            borderRadius: 16,
            padding: tab === "integrations" ? 18 : tab === "payments" || tab === "credit-history" ? 20 : 22,
            minHeight: 400,
            border: "1px solid var(--color-border)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          }}
        >
          {tab === "profile" && <ProfileSettingsPanel />}
          {tab === "integrations" && <IntegrationsHub />}
          {tab === "payments" && (
            <Suspense fallback={<p style={{ color: "var(--color-text-muted)" }}>Loading…</p>}>
              <PaymentSettingsPanel />
            </Suspense>
          )}
          {tab === "credit-history" && <CreditHistorySettingsPanel />}
          {tab === "test-configuration" && <TestConfigurationSection />}
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
