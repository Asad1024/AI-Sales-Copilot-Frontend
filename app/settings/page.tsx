"use client";

import { Fragment, useState, useEffect, Suspense, type ReactNode } from "react";
import { Icons } from "@/components/ui/Icons";
import { useSearchParams, useRouter } from "next/navigation";
import { TestConfigurationSection } from "./TestConfigurationSection";
import { IntegrationsHub } from "./IntegrationsHub";
import BaseCard from "@/components/ui/BaseCard";
import { ProfileSettingsPanel } from "./ProfileSettingsPanel";
import { PaymentSettingsPanel } from "./PaymentSettingsPanel";
import { CreditCard } from "lucide-react";

const navIconBox = { width: 18, height: 18, display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const };
const UserIcon = () => (
  <span style={navIconBox}>
    <Icons.User size={18} strokeWidth={1.75} />
  </span>
);
const PlugTabIcon = () => (
  <span style={navIconBox}>
    <Icons.Plug size={18} strokeWidth={1.75} />
  </span>
);
const TestConfigTabIcon = () => (
  <span style={navIconBox}>
    <Icons.Zap size={18} strokeWidth={1.75} />
  </span>
);
const PaymentsTabIcon = () => (
  <span style={navIconBox}>
    <CreditCard size={18} strokeWidth={1.75} />
  </span>
);

type SettingsTabId = "profile" | "integrations" | "payments" | "test-configuration";

function parseSettingsTab(raw: string | null): SettingsTabId {
  if (raw === "integrations" || raw === "connectors") return "integrations";
  if (raw === "payments" || raw === "billing") return "payments";
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

  const tabs: { id: SettingsTabId; label: string; hint: string; icon: () => ReactNode }[] = [
    { id: "profile", label: "Profile", hint: "Identity, password & account", icon: UserIcon },
    { id: "integrations", label: "Integrations", hint: "CRM & messaging", icon: PlugTabIcon },
    { id: "payments", label: "Payments", hint: "Stripe receipts & plan", icon: PaymentsTabIcon },
    { id: "test-configuration", label: "Test configuration", hint: "Channels & SMTP", icon: TestConfigTabIcon },
  ];

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
          {tabs.map(({ id, label, hint, icon: Icon }) => {
            const active = tab === id;
            return (
              <Fragment key={id}>
                {id === "payments" || id === "test-configuration" ? (
                  <div className="my-1.5 h-px w-full shrink-0 bg-[#F3F4F6]" role="separator" aria-hidden />
                ) : null}
                <button
                  type="button"
                  onClick={() => selectTab(id)}
                  className={`settings-nav-item flex w-full min-h-[52px] items-center gap-2.5 border-0 py-3 pl-2.5 pr-3 text-left transition-colors ${
                    active
                      ? "bg-[rgba(124, 58, 237,0.1)] text-[var(--color-primary)]"
                      : "bg-transparent text-gray-600 hover:bg-[rgba(124, 58, 237,0.06)]"
                  }`}
                  data-active={active ? "true" : "false"}
                  style={{
                    borderLeft: active ? "3px solid var(--color-primary)" : "3px solid transparent",
                    borderRadius: 0,
                    cursor: "pointer",
                  }}
                >
                  <span className={`shrink-0 ${active ? "text-[var(--color-primary)]" : "text-gray-400"}`}>
                    <Icon />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium leading-tight ${active ? "text-[var(--color-primary)]" : "text-gray-600"}`}>{label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-gray-400">{hint}</span>
                  </span>
                </button>
                {id === "profile" ? (
                  <div className="my-1.5 h-px w-full shrink-0 bg-[#F3F4F6]" role="separator" aria-hidden />
                ) : null}
              </Fragment>
            );
          })}
        </nav>

        <BaseCard
          style={{
            borderRadius: 16,
            padding: tab === "integrations" ? 18 : tab === "payments" ? 20 : 22,
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
          {tab === "test-configuration" && <TestConfigurationSection />}
        </BaseCard>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (max-width: 820px) {
          .settings-layout-grid { grid-template-columns: 1fr !important; }
          .settings-nav { position: static !important; flex-direction: row !important; flex-wrap: wrap !important; gap: 8px !important; }
          .settings-nav button.settings-nav-item { flex: 1 1 calc(50% - 4px); min-width: 140px; }
        }
        .settings-nav-item[data-active="false"]:hover {
          background: rgba(124, 58, 237, 0.06) !important;
        }
      `,
        }}
      />
    </div>
  );
}
