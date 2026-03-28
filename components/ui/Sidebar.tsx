"use client";
import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getUser, clearAuth } from "@/lib/apiClient";
import { useBaseStore } from "@/stores/useBaseStore";
import { useSidebarStore, SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from "@/stores/useSidebarStore";
import BaseSelector from "./BaseSelector";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Megaphone,
  FileText,
  BarChart2,
  UserCircle2,
  Settings,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  MoreHorizontal,
  Bolt,
  LogOut,
  User,
  Bell,
} from "lucide-react";

function CollapsedHoverTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.top + r.height / 2, left: r.right + 8 });
  };

  return (
    <>
      <div
        ref={wrapRef}
        style={{ width: "100%" }}
        onMouseEnter={() => {
          updatePos();
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
      </div>
      {open && (
        <div
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transform: "translateY(-50%)",
            zIndex: 100,
            background: "#1F2937",
            color: "#FFFFFF",
            padding: 8,
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "Inter, sans-serif",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {label}
        </div>
      )}
    </>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  tour?: string;
}

const iconStroke = 1.5;
const iconSize = 16;
/** Active nav: soft blue-50/50 bg, blue-600 label + icon (Tailwind palette) */
const ACTIVE_NAV_BG = "rgba(239, 246, 255, 0.5)";
const ACTIVE_NAV_TEXT = "#2563EB";
const ACTIVE_NAV_ACCENT = "#2563EB";

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { activeBaseId } = useBaseStore();
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);

  const sidebarWidth = isMobile ? Math.min(280, typeof window !== "undefined" ? window.innerWidth : 280) : collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  useEffect(() => {
    setMounted(true);
    setUser(getUser());
    setIsMobile(window.innerWidth <= 768);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) onClose();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [onClose]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href.startsWith("/bases/") && href.includes("/leads"))
      return Boolean(pathname?.startsWith("/bases/") && pathname.includes("/leads"));
    if (href === "/bases") return Boolean(pathname?.startsWith("/bases") && !pathname.includes("/leads"));
    return Boolean(pathname?.startsWith(href) && href !== "/");
  };

  const dashboardNav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={iconSize} strokeWidth={iconStroke} /> },
  ];

  const campaignsNav: NavItem[] = [
    { href: "/bases", label: "Workspaces", icon: <FolderKanban size={iconSize} strokeWidth={iconStroke} />, tour: "bases-selector" },
    {
      href: activeBaseId ? `/bases/${activeBaseId}/leads` : "/leads",
      label: "Leads",
      icon: <Users size={iconSize} strokeWidth={iconStroke} />,
      tour: "leads-link",
    },
    { href: "/campaigns", label: "Campaigns", icon: <Megaphone size={iconSize} strokeWidth={iconStroke} />, tour: "campaigns-link" },
    { href: "/templates", label: "Templates", icon: <FileText size={iconSize} strokeWidth={iconStroke} />, tour: "templates-link" },
  ];

  const secondaryNav: NavItem[] = [
    { href: "/reports", label: "Reports", icon: <BarChart2 size={iconSize} strokeWidth={iconStroke} /> },
    { href: "/team", label: "Team", icon: <UserCircle2 size={iconSize} strokeWidth={iconStroke} /> },
    { href: "/notifications", label: "Notifications", icon: <Bell size={iconSize} strokeWidth={iconStroke} /> },
    ...(mounted && user?.role === "admin"
      ? [{ href: "/admin", label: "Admin", icon: <Shield size={iconSize} strokeWidth={iconStroke} /> }]
      : []),
  ];

  const userInitials = (user?.name || user?.email || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const Divider = () => (
    <div
      style={{
        height: 1,
        background: "#E5E7EB",
        margin: "8px 12px",
        flexShrink: 0,
      }}
      className="sidebar-premium-divider"
      aria-hidden
    />
  );

  const GroupLabel = ({ text, isFirstCategory }: { text: string; isFirstCategory?: boolean }) =>
    !(collapsed && !isMobile) ? (
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.06em",
          color: "#9CA3AF",
          textTransform: "uppercase",
          padding: "0 12px",
          marginTop: isFirstCategory ? 20 : 16,
          marginBottom: 6,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {text}
      </div>
    ) : null;

  const renderNavItems = (items: NavItem[]) =>
    items.map((item) => {
      const active = isActive(item.href);
      const link = (
        <Link
          href={item.href}
          data-tour={item.tour}
          className="sidebar-nav-link"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed && !isMobile ? "center" : "flex-start",
            gap: 10,
            minHeight: 36,
            height: 36,
            padding: collapsed && !isMobile ? "0 10px" : "0 9px",
            boxSizing: "border-box",
            borderLeft: collapsed && !isMobile ? "none" : `3px solid ${active ? ACTIVE_NAV_ACCENT : "transparent"}`,
            boxShadow:
              collapsed && !isMobile && active ? `inset 3px 0 0 0 ${ACTIVE_NAV_ACCENT}` : "none",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: active ? 600 : 500,
            fontFamily: "Inter, sans-serif",
            transition: "background 150ms ease, color 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
            color: active ? ACTIVE_NAV_TEXT : "#374151",
            background: active ? ACTIVE_NAV_BG : "transparent",
            position: "relative",
            marginBottom: 2,
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
          <span style={{ display: "inline-flex", flexShrink: 0, color: active ? ACTIVE_NAV_ACCENT : "#6B7280" }}>{item.icon}</span>
          {!(collapsed && !isMobile) && (
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
          )}
        </Link>
      );

      if (collapsed && !isMobile) {
        return (
          <CollapsedHoverTip key={item.href} label={item.label}>
            {link}
          </CollapsedHoverTip>
        );
      }
      return <span key={item.href}>{link}</span>;
    });

  return (
    <>
      {isMobile && isOpen && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 25 }} aria-hidden />
      )}
      <aside
        className="sidebar-premium-aside"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: isMobile ? sidebarWidth : sidebarWidth,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          zIndex: 30,
          transform: isMobile && !isOpen ? "translateX(-100%)" : "translateX(0)",
          transition: "width 200ms ease, transform 0.2s ease",
          boxShadow: "none",
        }}
      >
        {/* Brand + collapse (desktop) */}
        <div
          className="sidebar-premium-logo"
          style={{
            height: 56,
            minHeight: 56,
            padding: collapsed && !isMobile ? "0 10px" : "0 12px",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <Link
            href="/dashboard"
            title="Sales Co-Pilot"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "#111827",
              minWidth: 0,
              flex: collapsed && !isMobile ? undefined : 1,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Bolt size={17} strokeWidth={1.5} />
            </div>
            {!(collapsed && !isMobile) && (
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  fontFamily: "Inter, sans-serif",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Sales Co-Pilot
              </span>
            )}
          </Link>
          {!isMobile && (
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={{
                width: 28,
                height: 28,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                border: "none",
                background: "transparent",
                color: "#9CA3AF",
                cursor: "pointer",
                transition: "color 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#4F46E5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#9CA3AF";
              }}
            >
              {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.5} /> : <PanelLeftClose size={18} strokeWidth={1.5} />}
            </button>
          )}
        </div>

        {/* Workspace switcher */}
        <div style={{ padding: collapsed && !isMobile ? "10px 8px" : "12px 10px", flexShrink: 0 }}>
          <BaseSelector variant="sidebar-premium" collapsed={collapsed && !isMobile} />
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <nav
            style={{
              flex: "0 1 auto",
              overflowX: "hidden",
              overflowY: "auto",
              minHeight: 0,
              padding: "4px 10px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ paddingTop: 8, paddingBottom: 8 }}>{renderNavItems(dashboardNav)}</div>
            <Divider />
            <div style={{ paddingTop: 0, paddingBottom: 8 }}>
              <GroupLabel text="Campaigns" isFirstCategory />
              {renderNavItems(campaignsNav)}
            </div>
            <Divider />
            <div style={{ paddingTop: 8, paddingBottom: 8 }}>
              <GroupLabel text="Analytics" />
              {renderNavItems(secondaryNav)}
            </div>
          </nav>
          <div style={{ flex: "1 1 0", minHeight: 0 }} aria-hidden />
        </div>

        {/* User */}
        <div
          className="sidebar-premium-user"
          style={{
            padding: "12px 10px",
            borderTop: "1px solid #E5E7EB",
            position: "relative",
            flexShrink: 0,
          }}
        >
          {collapsed && !isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 12,
                  flexShrink: 0,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {userInitials}
              </div>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-label="Account menu"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "#9CA3AF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "color 150ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#4F46E5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#9CA3AF";
                }}
              >
                <MoreHorizontal size={18} strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 12,
                  flexShrink: 0,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {userInitials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#111827" }}>
                  {user?.name || "Account"}
                </div>
                <div style={{ fontSize: 11, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.email || ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-label="Account menu"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "#9CA3AF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "color 150ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#4F46E5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#9CA3AF";
                }}
              >
                <MoreHorizontal size={18} strokeWidth={1.5} />
              </button>
            </div>
          )}

          {userMenuOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setUserMenuOpen(false)} aria-hidden />
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: collapsed && !isMobile ? 8 : 10,
                  width: 160,
                  padding: 8,
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
                  zIndex: 50,
                }}
              >
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    height: 32,
                    padding: "0 8px",
                    borderRadius: 6,
                    textDecoration: "none",
                    color: "#374151",
                    fontSize: 14,
                    fontWeight: 500,
                    transition: "background 150ms ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F3F4F6")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <User size={16} strokeWidth={1.5} />
                  Profile settings
                </Link>
                <Link
                  href="/settings/test-configuration"
                  onClick={() => setUserMenuOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    height: 32,
                    padding: "0 8px",
                    borderRadius: 6,
                    textDecoration: "none",
                    color: "#374151",
                    fontSize: 14,
                    fontWeight: 500,
                    transition: "background 150ms ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F3F4F6")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Settings size={16} strokeWidth={1.5} />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    clearAuth();
                    window.location.href = "/auth/login";
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    height: 32,
                    padding: "0 8px",
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    color: "#374151",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 150ms ease, color 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F3F4F6";
                    e.currentTarget.style.color = "#EF4444";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#374151";
                  }}
                >
                  <LogOut size={16} strokeWidth={1.5} />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
