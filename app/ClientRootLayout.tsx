"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import Sidebar from "@/components/ui/Sidebar";
import AdminSidebar from "@/components/ui/AdminSidebar";
import { BaseProvider } from "@/context/BaseContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ConfirmProvider } from "@/context/ConfirmContext";
import { useBaseStore } from "@/stores/useBaseStore";
import { useSidebarStore, getSidebarWidthPx } from "@/stores/useSidebarStore";
import { WebSocketProvider } from "@/components/notifications/WebSocketProvider";
import { CampaignLiveModalHost } from "@/components/campaigns/CampaignLiveModalHost";
import AuthGuard from "@/components/auth/AuthGuard";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { BillingExpiryBanner } from "@/components/billing/BillingExpiryBanner";
import PageHeader from "@/components/ui/PageHeader";
import { goToNewCampaignOrWorkspaces } from "@/lib/goToNewCampaign";
import { APP_BRAND_BROWSER_TITLE, APP_BRAND_NAME, APP_BRAND_TAGLINE } from "@/lib/brand";
import { AppQueryProvider } from "@/providers/AppQueryProvider";
import { isAuthenticated } from "@/lib/apiClient";

export default function ClientRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeBaseId } = useBaseStore();
  const sidebarCollapsed = useSidebarStore((s) => s.collapsed);

  const isHybridMarketingPage =
    pathname?.startsWith("/about") ||
    pathname?.startsWith("/contact") ||
    pathname?.startsWith("/help") ||
    pathname?.startsWith("/integration");

  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/upgrade") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/flow") ||
    (isHybridMarketingPage && !isAuthenticated());
  const isOnboardingPage = pathname?.startsWith("/onboarding");
  const isUpgradePage = pathname?.startsWith("/upgrade");
  const isAboutPage = pathname?.startsWith("/about");
  const isContactPage = pathname?.startsWith("/contact");
  const isHelpPage = pathname?.startsWith("/help");
  // Only render the upgrade-style full-bleed shell for these pages when unauthenticated.
  // When authenticated, they should look like normal portal pages (sidebar + header).
  const isMarketingFullBleedShell =
    isUpgradePage || ((isAboutPage || isContactPage || isHelpPage) && !isAuthenticated());
  const isAdminPage = pathname?.startsWith("/admin");
  const showHeaderSidebar = !isPublicPage && !isOnboardingPage && !isMarketingFullBleedShell;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const getPageMeta = () => {
    if (!pathname) {
      return { title: "Dashboard", description: "Track performance and run your sales engine." };
    }
    if (pathname === "/") {
      return { title: APP_BRAND_NAME, description: `${APP_BRAND_NAME} — ${APP_BRAND_TAGLINE}` };
    }
    if (pathname.startsWith("/dashboard")) {
      return { title: "Dashboard", description: "Track performance and run your sales engine." };
    }
    if (pathname.startsWith("/admin/analytics")) {
      return { title: "Analytics", description: "Platform charts, trends, and detailed breakdowns." };
    }
    if (pathname.startsWith("/admin/users")) {
      return { title: "Users", description: "Create, edit roles, and remove accounts." };
    }
    if (pathname.startsWith("/admin/bases")) {
      return { title: "Workspaces", description: "All bases · owner shown." };
    }
    if (pathname.startsWith("/admin/campaigns")) {
      return { title: "Campaigns", description: "Inspect and delete campaigns · search and status filters." };
    }
    if (pathname.startsWith("/admin/leads")) {
      return { title: "Leads", description: "Inspect and delete leads · latest batch loaded." };
    }
    if (pathname.startsWith("/admin/subscriptions")) {
      return { title: "Subscriptions", description: "Billing roadmap · filter topics below." };
    }
    if (pathname.startsWith("/admin/payments")) {
      return { title: "Payments", description: "Stripe transactions across all users." };
    }
    if (pathname.startsWith("/admin/notifications")) {
      return { title: "Notifications", description: "Account and system alerts." };
    }
    if (pathname.startsWith("/admin/logs")) {
      return { title: "Activity", description: "Audit log roadmap · filter checklist items." };
    }
    if (pathname.startsWith("/admin/settings")) {
      return { title: "Admin settings", description: "Your platform operator profile and password." };
    }
    if (pathname.startsWith("/admin")) {
      return { title: "Overview", description: "Platform metrics and quick navigation." };
    }
    if (pathname.includes("/companies")) {
      return { title: "Companies", description: "Organizations in your workspace and leads linked to each company." };
    }
    if (pathname.includes("/leads")) {
      return { title: "Leads", description: "Import, enrich, score, and manage your lead pipeline." };
    }
    if (pathname.startsWith("/campaigns")) {
      return { title: "Campaigns", description: "Launch and monitor multi-channel outreach." };
    }
    if (pathname.startsWith("/bases")) {
      return { title: "Workspaces", description: "Organize leads and campaigns by workspace." };
    }
    if (pathname.startsWith("/templates")) {
      return { title: "Templates", description: "Manage reusable outreach content." };
    }
    if (pathname.startsWith("/reports")) {
      return { title: "Reports", description: "Review analytics, funnel, and trends." };
    }
    if (pathname.startsWith("/team")) {
      return { title: "Team", description: "Manage collaborators and permissions." };
    }
    if (pathname.startsWith("/integration")) {
      return { title: "Integration", description: "Connect messaging, CRM, and data sources." };
    }
    if (pathname.startsWith("/upgrade")) {
      return {
        title: "Plans & upgrade",
        description: "Leads Reach pricing and Stripe checkout (when configured).",
      };
    }
    if (pathname.startsWith("/contact")) {
      return {
        title: "Contact",
        description: "Contact the Leads Reach team — sales, support, and partnerships.",
      };
    }
    if (pathname.startsWith("/pricing")) {
      return {
        title: "Pricing",
        description: "Leads Reach plans in AED and Stripe-powered checkout when enabled.",
      };
    }
    if (pathname.startsWith("/notifications")) {
      return {
        title: "Notifications",
        description: "Account activity, workspace changes, security, and system alerts.",
      };
    }
    if (pathname.startsWith("/help")) {
      return {
        title: "Help & Support",
        description: "Contact support, billing links, and quick tips for using the portal.",
      };
    }
    if (pathname.startsWith("/settings/chart-gallery")) {
      return {
        title: "Chart gallery",
        description: "Reference chart types with dummy sample data (ECharts).",
      };
    }
    if (pathname.startsWith("/settings")) {
      return { title: "Settings", description: "Profile, integrations, payments, and workspace tools." };
    }
    return { title: APP_BRAND_NAME, description: `${APP_BRAND_NAME} — ${APP_BRAND_TAGLINE}` };
  };

  const pageMeta = getPageMeta();

  React.useEffect(() => {
    document.title = APP_BRAND_BROWSER_TITLE;
  }, [pathname]);

  const mainSidebarWidthPx = getSidebarWidthPx(sidebarCollapsed, isMobile);
  const mainContentPadding =
    pathname?.startsWith("/settings") ? "8px 10px 20px" : "8px 20px 20px";

  return (
    <NotificationProvider>
      <ConfirmProvider>
        <AppQueryProvider>
        <BaseProvider>
          {isPublicPage ? (
            <main
              style={{
                minHeight: "100vh",
                background: "var(--color-background)",
              }}
            >
              {children}
            </main>
          ) : (
            <AuthGuard>
              <WebSocketProvider>
                <CampaignLiveModalHost />
                <EmailVerificationBanner />
                <BillingExpiryBanner
                  leftOffsetPx={showHeaderSidebar ? mainSidebarWidthPx : 0}
                />

                {showHeaderSidebar ? (
                  <div className="main-layout">
                    {isAdminPage ? (
                      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                    ) : (
                      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                    )}

                    <main
                      style={{
                        flex: 1,
                        minHeight: "100vh",
                        background: "var(--color-canvas, var(--color-background))",
                        marginLeft: mainSidebarWidthPx,
                        transition: "margin-left 200ms ease, width 200ms ease",
                        width:
                          mainSidebarWidthPx === 0 ? "100%" : `calc(100% - ${mainSidebarWidthPx}px)`,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <PageHeader
                        title={pageMeta.title}
                        description={pageMeta.description}
                        onNewCampaign={() => goToNewCampaignOrWorkspaces(router, activeBaseId)}
                        onWatchDemo={() => router.push("/demo")}
                        activeBaseId={activeBaseId != null ? String(activeBaseId) : undefined}
                        onAddLead={() =>
                          router.push(activeBaseId ? `/bases/${activeBaseId}/leads` : "/bases")
                        }
                      />
                      <div
                        style={{
                          flex: 1,
                          padding: mainContentPadding,
                        }}
                      >
                        {children}
                      </div>
                    </main>
                  </div>
                ) : isMarketingFullBleedShell ? (
                  <main
                    style={{
                      minHeight: "100vh",
                      margin: 0,
                      padding: 0,
                      background: "transparent",
                      color: "var(--color-text)",
                    }}
                  >
                    {children}
                  </main>
                ) : (
                  <main
                    style={{
                      minHeight: "100vh",
                      margin: 0,
                      padding: 0,
                      background: "var(--color-background)",
                      color: "var(--color-text)",
                    }}
                  >
                    {children}
                  </main>
                )}
              </WebSocketProvider>
            </AuthGuard>
          )}
        </BaseProvider>
        </AppQueryProvider>
      </ConfirmProvider>
    </NotificationProvider>
  );
}
