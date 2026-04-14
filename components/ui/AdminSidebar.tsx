"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  FolderKanban,
  CreditCard,
  Receipt,
  Bell,
  ScrollText,
  Settings,
  BarChart2,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { AppBrandLogoMark } from "@/components/ui/AppBrandLogo";
import { getUser, clearAuth, type User } from "@/lib/apiClient";
// import ThemeToggle from "./ThemeToggle";
import { useSidebarStore, SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from "@/stores/useSidebarStore";
import { useNotificationStore } from "@/stores/useNotificationStore";

const iconStroke = 1.5;
const iconSize = 16;
const ACTIVE_NAV_BG = "rgba(124, 58, 237, 0.09)";
const ACTIVE_NAV_TEXT = "#7C3AED";
const ACTIVE_NAV_ACCENT = "#7C3AED";

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

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

function SidebarUserAvatar({ avatarUrl, initials }: { avatarUrl?: string | null; initials: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [avatarUrl]);
  const showImg = Boolean(avatarUrl?.trim()) && !imgFailed;
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        overflow: "hidden",
        flexShrink: 0,
        background: "linear-gradient(135deg, #9333EA 0%, #7C3AED 55%, #6D28D9 100%)",
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl!.trim()}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 12,
            color: "#fff",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const refreshUnreadCount = useNotificationStore((s) => s.refreshUnreadCount);

  const sidebarWidth = isMobile
    ? Math.min(288, typeof window !== "undefined" ? window.innerWidth : 288)
    : collapsed
      ? SIDEBAR_WIDTH_COLLAPSED
      : SIDEBAR_WIDTH_EXPANDED;

  useEffect(() => {
    setUser(getUser());
    setIsMobile(window.innerWidth <= 768);
  }, []);

  useEffect(() => {
    const syncUser = () => setUser(getUser());
    window.addEventListener("sparkai:user-changed", syncUser);
    return () => window.removeEventListener("sparkai:user-changed", syncUser);
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) onClose();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [onClose]);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return Boolean(pathname?.startsWith(href));
  };

  const primaryNav: NavItem[] = [
    { href: "/admin", label: "Overview", icon: <LayoutDashboard size={iconSize} strokeWidth={iconStroke} /> },
    { href: "/admin/analytics", label: "Analytics", icon: <BarChart2 size={iconSize} strokeWidth={iconStroke} /> },
    { href: "/admin/users", label: "Users", icon: <Users size={iconSize} strokeWidth={iconStroke} /> },
    { href: "/admin/bases", label: "Workspaces", icon: <FolderKanban size={iconSize} strokeWidth={iconStroke} /> },
    { href: "/admin/campaigns", label: "Campaigns", icon: <Megaphone size={iconSize} strokeWidth={iconStroke} /> },
    { href: "/admin/leads", label: "Leads", icon: <Users size={iconSize} strokeWidth={iconStroke} /> },
  ];

  const secondaryNav: NavItem[] = [
    { href: "/admin/subscriptions", label: "Subscriptions", icon: <CreditCard size={iconSize} strokeWidth={iconStroke} /> },
    { href: "/admin/payments", label: "Payments", icon: <Receipt size={iconSize} strokeWidth={iconStroke} /> },
    { href: "/admin/notifications", label: "Notifications", icon: <Bell size={iconSize} strokeWidth={iconStroke} /> },
    { href: "/admin/logs", label: "Activity", icon: <ScrollText size={iconSize} strokeWidth={iconStroke} /> },
    { href: "/admin/settings", label: "Settings", icon: <Settings size={iconSize} strokeWidth={iconStroke} /> },
  ];

  const userInitials = (user?.name || user?.email || "A")
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
        margin: "3px 12px",
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
          marginTop: isFirstCategory ? 10 : 8,
          marginBottom: 4,
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
          className="sidebar-nav-link"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed && !isMobile ? "center" : "flex-start",
            gap: 10,
            minHeight: active ? 42 : 34,
            padding:
              collapsed && !isMobile
                ? `${active ? 8 : 5}px 10px`
                : `${active ? 10 : 7}px ${active ? 14 : 11}px`,
            boxSizing: "border-box",
            borderLeft: active ? `3px solid ${ACTIVE_NAV_ACCENT}` : "3px solid transparent",
            boxShadow: "none",
            borderRadius: active ? 0 : 8,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: active ? 600 : 500,
            fontFamily: "Inter, sans-serif",
            transition:
              "background 150ms ease, color 150ms ease, padding 150ms ease, border-radius 150ms ease, min-height 150ms ease",
            color: active ? ACTIVE_NAV_TEXT : "#374151",
            background: active ? ACTIVE_NAV_BG : "transparent",
            position: "relative",
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
          <span
            style={{
              display: "inline-flex",
              flexShrink: 0,
              color: active ? ACTIVE_NAV_ACCENT : "#6B7280",
            }}
          >
            {item.icon}
          </span>
          {!(collapsed && !isMobile) && (
            <span
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </span>
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

  const logout = () => {
    clearAuth();
    router.push("/auth/login");
  };

  return (
    <>
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 25 }}
          aria-hidden
        />
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
        <div
          className="sidebar-premium-logo"
          style={{
            height: 56,
            minHeight: 56,
            paddingTop: 0,
            paddingBottom: 0,
            paddingRight: collapsed && !isMobile ? 10 : 12,
            paddingLeft: collapsed && !isMobile ? 17 : 21,
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <Link
            href="/admin"
            className="sidebar-logo-link"
            title="Admin"
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
            <AppBrandLogoMark size={collapsed && !isMobile ? 30 : 40} />
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
                Admin
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
                e.currentTarget.style.color = "#7C3AED";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#9CA3AF";
              }}
            >
              {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.5} /> : <PanelLeftClose size={18} strokeWidth={1.5} />}
            </button>
          )}
        </div>

        {!collapsed || isMobile ? (
          <div style={{ padding: "10px 14px 8px", flexShrink: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: "#6B7280",
                textTransform: "uppercase",
              }}
            >
              Platform
            </div>
          </div>
        ) : null}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <nav
            className="sidebar-nav-scroll"
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
            <div style={{ paddingTop: 3, paddingBottom: 3 }}>{renderNavItems(primaryNav)}</div>
            <Divider />
            <div style={{ paddingTop: 0, paddingBottom: 3 }}>
              <GroupLabel text="Operations" isFirstCategory />
              {renderNavItems(secondaryNav)}
            </div>
          </nav>
          <div style={{ flex: "1 1 0", minHeight: 0 }} aria-hidden />
        </div>

        <div
          className="sidebar-premium-user"
          style={{
            padding: "14px 12px",
            borderTop: "1px solid #E5E7EB",
            position: "relative",
            flexShrink: 0,
          }}
        >
          {collapsed && !isMobile ? (
            <Link
              href="/admin/settings"
              className="sidebar-user-box-link"
              title="Settings"
              aria-label="Open settings"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "12px 8px",
                borderRadius: 10,
                background: "#F3F4F6",
                textDecoration: "none",
                color: "inherit",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#E8EAED";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#F3F4F6";
              }}
            >
              <SidebarUserAvatar avatarUrl={user?.avatar_url} initials={userInitials} />
              <ChevronRight size={18} strokeWidth={1.5} style={{ color: "#9CA3AF" }} aria-hidden />
            </Link>
          ) : (
            <Link
              href="/admin/settings"
              className="sidebar-user-box-link"
              title="Settings"
              aria-label="Open settings"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
                padding: "12px 14px",
                borderRadius: 10,
                background: "#F3F4F6",
                textDecoration: "none",
                color: "inherit",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#E8EAED";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#F3F4F6";
              }}
            >
              <SidebarUserAvatar avatarUrl={user?.avatar_url} initials={userInitials} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "#111827",
                  }}
                >
                  {user?.name || "Admin"}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#6B7280",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.email || "—"}
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={1.5} style={{ color: "#9CA3AF", flexShrink: 0 }} aria-hidden />
            </Link>
          )}

          <div
            style={{
              marginTop: 10,
              paddingTop: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Link
                href="/admin/settings"
                className="sidebar-footer-icon-link"
                title="Settings"
                aria-label="Settings"
                style={{
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6B7280",
                  textDecoration: "none",
                  borderRadius: 6,
                  transition: "color 150ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#7C3AED";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#6B7280";
                }}
              >
                <Settings size={16} strokeWidth={1.75} />
              </Link>
              {/* <ThemeToggle compact /> */}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                className="icon-btn header-utility-btn"
                onClick={() => router.push("/admin/notifications")}
                style={{
                  borderRadius: 6,
                  width: 24,
                  height: 24,
                  position: "relative",
                  border: "none",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#6B7280",
                  padding: 0,
                }}
                aria-label="Notifications"
              >
                <Bell size={15} strokeWidth={1.5} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: "#ef4444",
                    }}
                  />
                )}
              </button>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
                style={{
                  width: 24,
                  height: 24,
                  border: "none",
                  background: "transparent",
                  color: "#6B7280",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <LogOut size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
