"use client";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import Sidebar from "@/components/ui/Sidebar";
import AdminSidebar from "@/components/ui/AdminSidebar";
import "../styles/globals.css";
import { BaseProvider } from "@/context/BaseContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ConfirmProvider } from "@/context/ConfirmContext";
import { useBaseStore } from "@/stores/useBaseStore";
import { useSidebarStore, getSidebarWidthPx } from "@/stores/useSidebarStore";
import { WebSocketProvider } from "@/components/notifications/WebSocketProvider";
import AuthGuard from "@/components/auth/AuthGuard";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import PageHeader from "@/components/ui/PageHeader";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeBaseId } = useBaseStore();
  const sidebarCollapsed = useSidebarStore((s) => s.collapsed);
  
  // Determine if we're on a public page (landing, auth) or dashboard
  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/flow");
  const isOnboardingPage = pathname?.startsWith("/onboarding");
  const isAdminPage = pathname?.startsWith('/admin');
  const showHeaderSidebar = !isPublicPage && !isOnboardingPage;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Handle window resize for responsive layout
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getPageMeta = () => {
    if (!pathname) return { title: "Dashboard", description: "Track performance and run your sales engine." };
    if (pathname.startsWith("/dashboard")) return { title: "Dashboard", description: "Track performance and run your sales engine." };
    if (pathname.includes("/leads")) return { title: "Leads", description: "Import, enrich, score, and manage your lead pipeline." };
    if (pathname.startsWith("/campaigns")) return { title: "Campaigns", description: "Launch and monitor multi-channel outreach." };
    if (pathname.startsWith("/bases")) return { title: "Workspaces", description: "Organize leads and campaigns by workspace." };
    if (pathname.startsWith("/templates")) return { title: "Templates", description: "Manage reusable outreach content." };
    if (pathname.startsWith("/reports")) return { title: "Reports", description: "Review analytics, funnel, and trends." };
    if (pathname.startsWith("/team")) return { title: "Team", description: "Manage collaborators and permissions." };
    if (pathname.startsWith("/notifications"))
      return { title: "Notifications", description: "Account activity, workspace changes, security, and system alerts." };
    if (pathname.startsWith("/settings/test-configuration"))
      return { title: "Test Configuration", description: "Verify email, LinkedIn, WhatsApp, and call integrations." };
    if (pathname.startsWith("/settings")) return { title: "Settings", description: "Configure your Spark AI workspace." };
    if (pathname.startsWith("/admin")) return { title: "Admin", description: "Control platform-wide settings and users." };
    return { title: "Spark AI", description: "Premium AI-native sales workspace." };
  };
  const pageMeta = getPageMeta();

  const mainSidebarWidthPx = isAdminPage
    ? 256
    : getSidebarWidthPx(sidebarCollapsed, isMobile);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        style={{
          margin: 0,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "var(--color-background)",
          color: "var(--color-text)",
          overflowX: "hidden",
        }}
      >
          <NotificationProvider>
            <ConfirmProvider>
            <BaseProvider>
            {showHeaderSidebar ? (
              <AuthGuard>
                  <WebSocketProvider>
                  <EmailVerificationBanner />

                  <div className="main-layout">
                    {isAdminPage ? (
                      <AdminSidebar
                        isOpen={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                        collapsed={false}
                        onToggle={() => {}}
                      />
                    ) : (
                      <Sidebar
                        isOpen={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                      />
                    )}

                    <main
                      style={{
                        flex: 1,
                        minHeight: "100vh",
                        background: "var(--color-canvas, var(--color-background))",
                        marginLeft: mainSidebarWidthPx,
                        transition: "margin-left 200ms ease, width 200ms ease",
                        width:
                          mainSidebarWidthPx === 0
                            ? "100%"
                            : `calc(100% - ${mainSidebarWidthPx}px)`,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <PageHeader
                        title={pageMeta.title}
                        description={pageMeta.description}
                        onNewCampaign={() => router.push("/campaigns/new")}
                        onWatchDemo={() => router.push("/demo")}
                        activeBaseId={activeBaseId != null ? String(activeBaseId) : undefined}
                        onAddLead={() =>
                          router.push(activeBaseId ? `/bases/${activeBaseId}/leads` : "/bases")
                        }
                      />
                      <div
                        style={{
                          flex: 1,
                          padding: "8px 20px 20px",
                        }}
                      >
                        {children}
                      </div>
                    </main>
                  </div>
                  </WebSocketProvider>
              </AuthGuard>
            ) : isOnboardingPage ? (
              <AuthGuard>
                <main
                  style={{
                    minHeight: "100vh",
                    margin: 0,
                    padding: 0,
                    background: "#f8fafc",
                  }}
                >
                  {children}
                </main>
              </AuthGuard>
            ) : (
              <main
                style={{
                  minHeight: "100vh",
                  background: "var(--color-background)",
                }}
              >
                {children}
              </main>
            )}
          </BaseProvider>
            </ConfirmProvider>
          </NotificationProvider>
      </body>
    </html>
  );
}
