"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Sidebar from "@/components/ui/Sidebar";
import AdminSidebar from "@/components/ui/AdminSidebar";
// import { ThemeProvider } from "@/lib/useTheme";
import "../styles/globals.css";
import { BaseProvider } from "@/context/BaseContext";
import { NotificationProvider } from "@/context/NotificationContext";
import BaseSelector from "@/components/ui/BaseSelector";
import { useBaseStore } from "@/stores/useBaseStore";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { WebSocketProvider } from "@/components/notifications/WebSocketProvider";
import AuthGuard from "@/components/auth/AuthGuard";
import { clearAuth, getUser } from "@/lib/apiClient";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeBaseId } = useBaseStore();
  
  // Determine if we're on a public page (landing, auth) or dashboard
  const isPublicPage = pathname === '/' || pathname.startsWith('/auth');
  const isAdminPage = pathname?.startsWith('/admin');
  const showHeaderSidebar = !isPublicPage;
  
  const Icon = {
    Dashboard: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z" />
      </svg>
    ),
    Robot: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="7" width="18" height="10" rx="2" />
        <path d="M12 3v4M8 11h.01M16 11h.01M8 17a4 4 0 0 0 8 0" />
      </svg>
    ),
    Theater: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 10s3-2 10-2 10 2 10 2v6s-3 2-10 2-10-2-10-2v-6z" />
        <path d="M8 13h.01M16 13h.01" />
      </svg>
    ),
    Rocket: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 15c-1.5 1.5-2 4-2 4s2.5-.5 4-2 8-10 8-10l-2-2s-8.5 8.5-8 10z" />
        <path d="M15 9l-6 6" />
        <path d="M5 19l2-2" />
      </svg>
    ),
    Users: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    Bolt: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
      </svg>
    )
  } as const;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const user = getUser();

  // Handle window resize for responsive layout
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
            <BaseProvider>
            {showHeaderSidebar ? (
              <AuthGuard>
                  <WebSocketProvider>
                  <header
                    style={{
                      background: "var(--color-surface)",
                      borderBottom: "1px solid var(--color-border)",
                      position: "sticky",
                      top: 0,
                      zIndex: 500,
                    }}
                  >
                    <div
                      style={{
                        padding: "0 20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        height: "56px",
                      }}
                    >
                      {/* Logo */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            height: "28px",
                            width: "28px",
                            borderRadius: "6px",
                            background: "#2563eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                            <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                          </svg>
                        </div>
                        <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--color-text)" }}>
                            Spark AI
                        </span>
                      </div>

                      <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        style={{
                          display: "none",
                          background: "var(--color-surface-secondary)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "8px",
                          padding: "8px",
                          color: "var(--color-text)",
                          cursor: "pointer",
                          fontSize: "16px",
                        }}
                        className="mobile-menu-btn"
                      >
                        ☰
                      </button>

                      <nav
                        className="desktop-nav"
                        style={{ display: "flex", alignItems: "center", gap: "12px" }}
                      />

                      {mobileMenuOpen && (
                        <div
                          className="mobile-nav-overlay"
                          style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100vh",
                            background: "var(--color-background)",
                            backdropFilter: "blur(10px)",
                            zIndex: 1000,
                            display: "flex",
                            flexDirection: "column",
                            padding: "80px 24px 24px",
                            animation: "fadeIn 0.3s ease-out",
                          }}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <div
                            style={{
                              background: "var(--color-surface)",
                              borderRadius: "16px",
                              padding: "24px",
                              border: "1px solid var(--color-border)",
                              backdropFilter: "blur(20px)",
                            }}
                          >
                            <h2
                              style={{
                                fontSize: "24px",
                                fontWeight: "700",
                                margin: "0 0 24px 0",
                                background:
                                  "linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                              }}
                            >
                              Navigation
                            </h2>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              {(() => {
                                const { useBaseStore } = require("@/stores/useBaseStore");
                                const activeBaseId = useBaseStore.getState().activeBaseId;
                                return [
                                  { href: "/dashboard", label: "Dashboard", icon: Icon.Dashboard },
                                  { href: "/flow/new-goal", label: "AI Flow", icon: Icon.Robot },
                                  { href: "/campaigns", label: "Campaigns", icon: Icon.Rocket },
                                  { href: activeBaseId ? `/bases/${activeBaseId}/leads` : "/bases", label: "Leads", icon: Icon.Users },
                                ];
                              })().map((item) => (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  style={{
                                    padding: "16px 20px",
                                    borderRadius: "12px",
                                    color:
                                      pathname === item.href ||
                                      pathname.startsWith(item.href + "/")
                                        ? "#000000"
                                        : "var(--color-text)",
                                    textDecoration: "none",
                                    transition: "all 0.3s ease",
                                    background:
                                      pathname === item.href ||
                                      pathname.startsWith(item.href + "/")
                                        ? "linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)"
                                        : "var(--color-surface-secondary)",
                                    border:
                                      pathname === item.href ||
                                      pathname.startsWith(item.href + "/") ||
                                      (item.href.startsWith('/bases/') && pathname.startsWith('/bases/') && pathname.includes('/leads'))
                                        ? "none"
                                        : "1px solid var(--color-border)",
                                    fontSize: "16px",
                                    fontWeight: "500",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    boxShadow:
                                      pathname === item.href ||
                                      pathname.startsWith(item.href + "/")
                                        ? "0 4px 12px rgba(76, 103, 255, 0.3)"
                                        : "none",
                                  }}
                                >
                                  <span style={{ display: "inline-flex" }} aria-hidden="true">
                                    {item.icon}
                                  </span>
                                  {item.label}
                                </Link>
                              ))}

                              <div
                                style={{
                                  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                                  marginTop: "8px",
                                  paddingTop: "16px",
                                }}
                              >
                                <h3
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    color: "var(--color-text-muted)",
                                    margin: "0 0 12px 0",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                  }}
                                >
                                  More Pages
                                </h3>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "8px",
                                  }}
                                >
                                  {[
                                    { href: "/bases", label: "Bases" },
                                    { href: "/templates", label: "Templates" },
                                    { href: "/reports", label: "Reports" },
                                    { href: "/team", label: "Team" },
                                    { href: "/settings", label: "Settings" },
                                  ].map((item) => (
                                    <Link
                                      key={item.href}
                                      href={item.href}
                                      onClick={() => setMobileMenuOpen(false)}
                                      style={{
                                        padding: "12px 16px",
                                        borderRadius: "8px",
                                        color: "var(--color-text)",
                                        textDecoration: "none",
                                        transition: "all 0.3s ease",
                                        background: "rgba(255, 255, 255, 0.05)",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        textAlign: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      {item.label}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Right side controls */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <BaseSelector />
                        
                        <div style={{ width: "1px", height: "20px", background: "var(--color-border)", margin: "0 4px" }} />
                        
                        <NotificationBell />
                        <ThemeToggle />
                        
                        {/* User menu */}
                        <div style={{ position: "relative" }}>
                          <button
                            type="button"
                            onClick={() => setUserMenuOpen((v) => !v)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "4px 8px 4px 4px",
                              borderRadius: "6px",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-secondary)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            aria-label="Account menu"
                          >
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background: "#2563eb",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontWeight: 600,
                                fontSize: 12,
                              }}
                            >
                              {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
                            </div>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--color-text-muted)" }}>
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>

                          {userMenuOpen && (
                            <div
                              style={{
                                position: "absolute",
                                right: 0,
                                top: "calc(100% + 4px)",
                                width: 220,
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "8px",
                                boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                                zIndex: 1000,
                                overflow: "hidden",
                              }}
                              onMouseLeave={() => setUserMenuOpen(false)}
                            >
                              {/* User info */}
                              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--color-border)" }}>
                                <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--color-text)", marginBottom: "2px" }}>
                                  {user?.name || "Account"}
                                </div>
                                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                                  {user?.email || ""}
                                </div>
                              </div>
                              
                              {/* Menu items */}
                              <div style={{ padding: "4px" }}>
                                <Link
                                  href="/settings"
                                  onClick={() => setUserMenuOpen(false)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "8px 10px",
                                    borderRadius: "4px",
                                    textDecoration: "none",
                                    color: "var(--color-text)",
                                    fontSize: "13px",
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-secondary)"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                                  </svg>
                                  Settings
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => {
                                    clearAuth();
                                    localStorage.removeItem("sparkai:profile_complete");
                                    window.location.href = "/auth/login";
                                  }}
                                  style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "8px 10px",
                                    borderRadius: "4px",
                                    background: "transparent",
                                    border: "none",
                                    color: "var(--color-text)",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    textAlign: "left",
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-secondary)"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                                  </svg>
                                  Sign out
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </header>

                  <div className="main-layout">
                    {isAdminPage ? (
                      <AdminSidebar
                        isOpen={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                        collapsed={sidebarCollapsed}
                        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                      />
                    ) : (
                      <Sidebar
                        isOpen={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                        collapsed={sidebarCollapsed}
                        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                      />
                    )}

                    <main
                      style={{
                        flex: 1,
                        minHeight: "calc(100vh - 72px)",
                        background: "var(--color-background)",
                        padding: pathname?.includes('/leads') ? "0" : "32px 24px",
                        marginLeft: isMobile ? 0 : (sidebarCollapsed ? '72px' : '260px'),
                        transition: 'margin-left 0.25s ease',
                        width: isMobile ? '100%' : (sidebarCollapsed ? 'calc(100% - 72px)' : 'calc(100% - 260px)'),
                      }}
                    >
                        {children}
                    </main>
                  </div>
                  </WebSocketProvider>
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
          </NotificationProvider>
      </body>
    </html>
  );
}
