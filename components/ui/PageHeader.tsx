"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { Icons } from "@/components/ui/Icons";

interface PageHeaderProps {
  title: string;
  description: string;
  onAddLead: () => void;
  onNewCampaign: () => void;
  onWatchDemo?: () => void;
  activeBaseId?: string;
}

export default function PageHeader({
  title,
  description,
  onAddLead: _onAddLead,
  onNewCampaign: _onNewCampaign,
  onWatchDemo: _onWatchDemo,
  activeBaseId,
}: PageHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showWorkspaceRequired, setShowWorkspaceRequired] = useState(false);

  const onDashboardPrimaryClick = () => {
    if (!activeBaseId) {
      setShowWorkspaceRequired(true);
      return;
    }
    router.push("/campaigns/new");
  };
  const isLeadsRoute = pathname?.includes("/leads");
  const isCampaignsRoute = pathname?.startsWith("/campaigns");
  const isSettingsShell = pathname?.startsWith("/settings");
  const isDashboardRoute = pathname?.startsWith("/dashboard");
  const isBasesRoute = pathname?.startsWith("/bases");
  const isTemplatesRoute = pathname?.startsWith("/templates");
  const isReportsRoute = pathname?.startsWith("/reports");
  const isTeamRoute = pathname?.startsWith("/team");
  const isAdminRoute = pathname?.startsWith("/admin");

  const showHeaderNewCampaign =
    !isDashboardRoute &&
    !isLeadsRoute &&
    !isCampaignsRoute &&
    !isSettingsShell &&
    !isBasesRoute &&
    !isTemplatesRoute &&
    !isReportsRoute &&
    !isTeamRoute &&
    !isAdminRoute;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "var(--color-canvas, var(--color-background))",
        padding: "12px 20px 8px",
        borderBottom: "1px solid var(--color-border-light)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            className="app-page-header-title"
            style={{
              margin: 0,
              marginTop: 0,
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.08,
              fontFamily: "Inter, -apple-system, sans-serif",
              color: "var(--color-text)",
            }}
          >
            {title}
          </h1>
          <p
            className="app-page-header-description"
            style={{
              marginTop: 8,
              marginBottom: 0,
              color: "#6B7280",
              fontSize: 13,
              fontWeight: 400,
              lineHeight: 1.45,
            }}
          >
            {description}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, border: "0.5px solid var(--color-border)", background: "var(--color-surface-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ThemeToggle />
          </div>
          <button
            type="button"
            className="icon-btn header-utility-btn"
            onClick={() => router.push("/settings")}
            style={{ borderRadius: 8, width: 36, height: 36, position: "relative", border: "0.5px solid var(--color-border)" }}
            aria-label="Notifications"
          >
            <Icons.Bell size={18} strokeWidth={1.5} />
            <span
              style={{
                position: "absolute",
                top: 7,
                right: 7,
                width: 7,
                height: 7,
                borderRadius: 999,
                background: "#ef4444",
              }}
            />
          </button>
          {showHeaderNewCampaign && (
            <button className="btn-primary shimmer-cta" onClick={onDashboardPrimaryClick} style={{ borderRadius: 8 }}>
              New Campaign
            </button>
          )}
        </div>
      </div>
      {showWorkspaceRequired && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 120,
            padding: 20,
          }}
          onClick={() => setShowWorkspaceRequired(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 460,
              background: "var(--elev-bg, var(--color-surface))",
              border: "0.5px solid var(--elev-border, var(--color-border))",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Workspace Required</div>
            <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 16 }}>
              You need to create or select a workspace before launching a campaign.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn-ghost" onClick={() => setShowWorkspaceRequired(false)} style={{ borderRadius: 8 }}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowWorkspaceRequired(false);
                  router.push("/bases");
                }}
                style={{ borderRadius: 8 }}
              >
                Create Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

