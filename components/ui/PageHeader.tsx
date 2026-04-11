"use client";

import { usePathname, useRouter } from "next/navigation";
import HeaderTopRightPills from "@/components/ui/HeaderTopRightPills";
import { goToNewCampaignOrWorkspaces } from "@/lib/goToNewCampaign";

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

  const onDashboardPrimaryClick = () => {
    goToNewCampaignOrWorkspaces(router, activeBaseId);
  };
  const isLeadsRoute = pathname?.includes("/leads");
  const isCampaignsRoute = pathname?.startsWith("/campaigns");
  const isSettingsShell = pathname?.startsWith("/settings");
  const isDashboardRoute = pathname?.startsWith("/dashboard");
  const isBasesRoute = pathname?.startsWith("/bases");
  const isTemplatesRoute = pathname?.startsWith("/templates");
  const isReportsRoute = pathname?.startsWith("/reports");
  const isTeamRoute = pathname?.startsWith("/team");
  const isNotificationsRoute = pathname?.startsWith("/notifications");
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
    !isNotificationsRoute &&
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
        <div style={{ flex: 1, minWidth: 0 }}>
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {!isAdminRoute && <HeaderTopRightPills />}
          {showHeaderNewCampaign && (
            <button className="btn-primary shimmer-cta" onClick={onDashboardPrimaryClick} style={{ borderRadius: 8 }}>
              New Campaign
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

