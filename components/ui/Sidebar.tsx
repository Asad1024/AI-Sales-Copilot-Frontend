"use client";
import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUser, type User } from "@/lib/apiClient";
import { useBaseStore } from "@/stores/useBaseStore";
import { useSidebarStore, SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from "@/stores/useSidebarStore";
import BaseSelector from "./BaseSelector";
import ThemeToggle from "./ThemeToggle";
import { Icons } from "./Icons";
import { useNotificationStore } from "@/stores/useNotificationStore";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Megaphone,
  FileText,
  BarChart2,
  UserCircle2,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
} from "lucide-react";
import { AppBrandLogoMark } from "@/components/ui/AppBrandLogo";

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
/** Active nav: soft violet tint, primary label + icon */
const ACTIVE_NAV_BG = "rgba(124, 58, 237, 0.09)";
const ACTIVE_NAV_TEXT = "#7C3AED";
const ACTIVE_NAV_ACCENT = "#7C3AED";

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
        // eslint-disable-next-line @next/next/no-img-element -- external OAuth URLs (Google)
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

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { activeBaseId } = useBaseStore();
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const refreshUnreadCount = useNotificationStore((s) => s.refreshUnreadCount);

  const sidebarWidth = isMobile ? Math.min(288, typeof window !== "undefined" ? window.innerWidth : 288) : collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  useEffect(() => {
    setMounted(true);
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
          data-tour={item.tour}
          className="sidebar-nav-link"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed && !isMobile ? "center" : "flex-start",
            gap: 10,
            minHeight: active ? 42 : 34,
            padding: collapsed && !isMobile
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
            transition: "background 150ms ease, color 150ms ease, padding 150ms ease, border-radius 150ms ease, min-height 150ms ease",
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
            href="/dashboard"
            className="sidebar-logo-link"
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
            <AppBrandLogoMark size={collapsed && !isMobile ? 30 : 40} />
            {!(collapsed && !isMobile) && (
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  fontFamily: "Inter, sans-serif",
                  color: "#111827",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
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
            <div style={{ paddingTop: 3, paddingBottom: 3 }}>{renderNavItems(dashboardNav)}</div>
            <Divider />
            <div style={{ paddingTop: 0, paddingBottom: 3 }}>
              <GroupLabel text="Campaigns" isFirstCategory />
              {renderNavItems(campaignsNav)}
            </div>
            <Divider />
            <div style={{ paddingTop: 3, paddingBottom: 3 }}>
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
            padding: "14px 12px",
            borderTop: "1px solid #E5E7EB",
            position: "relative",
            flexShrink: 0,
          }}
        >
          {collapsed && !isMobile ? (
            <Link
              href="/settings"
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
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9CA3AF",
                }}
                aria-hidden
              >
                <ChevronRight size={18} strokeWidth={1.5} />
              </span>
            </Link>
          ) : (
            <Link
              href="/settings"
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
                <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#111827" }}>
                  {user?.name || "Account"}
                </div>
                <div style={{ fontSize: 11, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.company?.trim() || "—"}
                </div>
              </div>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#9CA3AF",
                }}
                aria-hidden
              >
                <ChevronRight size={18} strokeWidth={1.5} />
              </span>
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
                href="/settings"
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
              <ThemeToggle compact />
            </div>
            <button
              type="button"
              className="icon-btn header-utility-btn"
              onClick={() => router.push("/notifications")}
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
              <Icons.Bell size={15} strokeWidth={1.5} />
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
          </div>
        </div>
      </aside>
    </>
  );
}
