"use client";
import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBaseStore } from "@/stores/useBaseStore";
import { useSidebarStore, SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from "@/stores/useSidebarStore";
import BaseSelector from "./BaseSelector";
import { Icons } from "@/components/ui/Icons";
import { PanelLeft, Puzzle, BarChart3, Building2 } from "lucide-react";
import {
  FiGrid,
  FiFolder,
  FiUsers,
  FiFileText,
} from "react-icons/fi";
import {
  APP_BRAND_LOGO_COLLAPSE_RAIL_HEIGHT,
  APP_BRAND_LOGO_COLLAPSE_RAIL_MAX_WIDTH,
  APP_BRAND_NAME,
  AppBrandLogoLockup,
} from "@/components/ui/AppBrandLogo";

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
            background: "var(--sidebar-tooltip-bg)",
            color: "var(--sidebar-tooltip-text)",
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

const iconSize = 18;
/** Active nav: soft violet tint, primary label + icon */
const ACTIVE_NAV_BG = "var(--sidebar-active-nav-bg)";
const ACTIVE_NAV_TEXT = "#ffffff";

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const { activeBaseId } = useBaseStore();
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const showCollapsedDividers = collapsed && !isMobile;
  const sidebarOpenLogoHeight = 34;
  const sidebarOpenLogoMaxWidth = 180;
  const sidebarOpenHeaderHeight = 72;

  const sidebarWidth = isMobile ? Math.min(288, typeof window !== "undefined" ? window.innerWidth : 288) : collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  useEffect(() => {
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

  const pathNorm = pathname ? pathname.split("?")[0].replace(/\/+$/, "") || "/" : "/";

  const isActive = (href: string) => {
    if (!pathname) return false;
    const norm = pathNorm;

    if (href === "/dashboard") return norm === "/dashboard";

    /** Companies: hub `/companies` or workspace route `/bases/:id/companies`. */
    if (href === "/companies") return norm === "/companies";
    if (href.includes("/companies")) {
      return /^\/bases\/[^/]+\/companies$/.test(norm);
    }

    if (href.startsWith("/bases/") && href.includes("/leads")) {
      return norm.startsWith("/bases/") && norm.includes("/leads");
    }

    /**
     * Workspaces: list `/bases` or workspace shell `/bases/:id` only — not leads, companies, schema, etc.
     */
    if (href === "/bases") {
      if (!norm.startsWith("/bases")) return false;
      if (norm === "/bases") return true;
      return /^\/bases\/[^/]+$/.test(norm);
    }

    return Boolean(norm.startsWith(href) && href !== "/");
  };

  const isNavItemActive = (item: NavItem): boolean => {
    if (item.tour === "companies-link") {
      return pathNorm === "/companies" || /^\/bases\/[^/]+\/companies$/.test(pathNorm);
    }
    return isActive(item.href);
  };

  const dashboardNav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <FiGrid size={iconSize} /> },
  ];

  const campaignsNav: NavItem[] = [
    { href: "/bases", label: "Workspaces", icon: <FiFolder size={iconSize} />, tour: "bases-selector" },
    {
      href: activeBaseId ? `/bases/${activeBaseId}/leads` : "/leads",
      label: "Leads",
      icon: <FiUsers size={iconSize} />,
      tour: "leads-link",
    },
    { href: "/campaigns", label: "Campaigns", icon: <Icons.Send size={iconSize} strokeWidth={1.9} />, tour: "campaigns-link" },
    {
      href: activeBaseId ? `/bases/${activeBaseId}/companies` : "/companies",
      label: "Companies",
      icon: <Building2 size={iconSize} strokeWidth={1.75} />,
      tour: "companies-link",
    },
    { href: "/templates", label: "Templates", icon: <FiFileText size={iconSize} />, tour: "templates-link" },
  ];

  const secondaryNav: NavItem[] = [
    { href: "/reports", label: "Analytics", icon: <BarChart3 size={iconSize} strokeWidth={1.9} /> },
    { href: "/integration", label: "Integration", icon: <Puzzle size={iconSize} strokeWidth={1.9} /> },
  ];

  const GroupLabel = ({ text, isFirstCategory }: { text: string; isFirstCategory?: boolean }) =>
    !(collapsed && !isMobile) ? (
      <div
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.06em",
          color: "var(--sidebar-label)",
          textTransform: "uppercase",
          padding: "0 12px",
          marginTop: isFirstCategory ? 10 : 12,
          marginBottom: 7,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {text}
      </div>
    ) : null;

  const renderNavItems = (items: NavItem[]) =>
    items.map((item) => {
      const active = isNavItemActive(item);
      const link = (
        <Link
          href={item.href}
          data-tour={item.tour}
          className="sidebar-nav-link"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed && !isMobile ? "center" : "flex-start",
            gap: 12,
            minHeight: active ? 44 : 42,
            padding: collapsed && !isMobile
              ? `${active ? 10 : 8}px 10px`
              : `${active ? 12 : 10}px ${active ? 14 : 12}px`,
            boxSizing: "border-box",
            boxShadow: "none",
            borderRadius: 12,
            textDecoration: "none",
            fontSize: 15,
            fontWeight: active ? 600 : 500,
            fontFamily: "Inter, sans-serif",
            transition: "background 150ms ease, color 150ms ease, border-color 150ms ease, padding 150ms ease, min-height 150ms ease",
            color: active ? ACTIVE_NAV_TEXT : "var(--sidebar-nav-text)",
            background: active ? ACTIVE_NAV_BG : "transparent",
            border: active ? "1px solid #DE8850" : "1px solid transparent",
            position: "relative",
            marginBottom: 8,
          }}
          onMouseEnter={(e) => {
            if (!active) {
              e.currentTarget.style.background = "var(--sidebar-nav-hover-bg)";
              e.currentTarget.style.color = "var(--sidebar-nav-hover-text)";
              e.currentTarget.style.borderColor = "transparent";
            }
          }}
          onMouseLeave={(e) => {
            if (!active) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--sidebar-nav-text)";
              e.currentTarget.style.borderColor = "transparent";
            } else {
              e.currentTarget.style.background = ACTIVE_NAV_BG;
              e.currentTarget.style.color = ACTIVE_NAV_TEXT;
              e.currentTarget.style.borderColor = "#DE8850";
            }
          }}
        >
          <span style={{ display: "inline-flex", flexShrink: 0, color: active ? ACTIVE_NAV_TEXT : "var(--sidebar-nav-icon)" }}>{item.icon}</span>
          {!(collapsed && !isMobile) && (
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
          )}
        </Link>
      );

      const navKey = item.tour ?? item.href;
      if (collapsed && !isMobile) {
        return (
          <CollapsedHoverTip key={navKey} label={item.label}>
            {link}
          </CollapsedHoverTip>
        );
      }
      return <span key={navKey}>{link}</span>;
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
          borderRight: "none",
        }}
      >
        {/* Brand + collapse (desktop) */}
        <div
          className="sidebar-premium-logo"
          style={{
            height: collapsed && !isMobile ? 78 : sidebarOpenHeaderHeight,
            minHeight: collapsed && !isMobile ? 78 : sidebarOpenHeaderHeight,
            /* Align logo top with app PageHeader title row (header uses paddingTop 12px) */
            paddingTop: collapsed && !isMobile ? 12 : 0,
            paddingBottom: 0,
            paddingRight: collapsed && !isMobile ? 10 : 12,
            paddingLeft: collapsed && !isMobile ? 15 : 13,
            borderBottom: "none",
            display: "flex",
            flexDirection: collapsed && !isMobile ? "column" : "row",
            alignItems: collapsed && !isMobile ? "center" : "center",
            justifyContent: "space-between",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <Link
            href="/dashboard"
            className="sidebar-logo-link"
            title={APP_BRAND_NAME}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "var(--sidebar-logo-text)",
              minWidth: 0,
              flex: collapsed && !isMobile ? undefined : 1,
              overflow: "hidden",
            }}
          >
            <AppBrandLogoLockup
              collapsed={collapsed && !isMobile}
              height={collapsed && !isMobile ? APP_BRAND_LOGO_COLLAPSE_RAIL_HEIGHT : sidebarOpenLogoHeight}
              style={{
                maxWidth:
                  collapsed && !isMobile ? APP_BRAND_LOGO_COLLAPSE_RAIL_MAX_WIDTH : sidebarOpenLogoMaxWidth,
                margin: collapsed && !isMobile ? "0 auto" : undefined,
              }}
            />
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
                color: "var(--sidebar-nav-muted-icon)",
                cursor: "pointer",
                transition: "color 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--color-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--sidebar-nav-muted-icon)";
              }}
            >
              <PanelLeft size={18} strokeWidth={1.9} />
            </button>
          )}
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
            className="sidebar-nav-scroll"
            style={{
              flex: "0 1 auto",
              overflowX: "hidden",
              overflowY: "auto",
              minHeight: 0,
              padding: "8px 10px 0",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ paddingTop: 2, paddingBottom: 2 }}>{renderNavItems(dashboardNav)}</div>
            {showCollapsedDividers ? (
              <div
                style={{
                  height: 1,
                  background: "var(--sidebar-divider)",
                  margin: "2px 12px 8px",
                  opacity: 0.9,
                }}
                aria-hidden
              />
            ) : null}
            <div style={{ paddingTop: 0, paddingBottom: 2 }}>
              <GroupLabel text="Campaigns" isFirstCategory />
              {renderNavItems(campaignsNav)}
            </div>
            {showCollapsedDividers ? (
              <div
                style={{
                  height: 1,
                  background: "var(--sidebar-divider)",
                  margin: "2px 12px 8px",
                  opacity: 0.9,
                }}
                aria-hidden
              />
            ) : null}
            <div style={{ paddingTop: 2, paddingBottom: 2 }}>
              <GroupLabel text="Other" />
              {renderNavItems(secondaryNav)}
            </div>
          </nav>
          <div style={{ flex: "1 1 0", minHeight: 0 }} aria-hidden />
        </div>

        {/* Workspace switcher moved to bottom */}
        <div style={{ padding: collapsed && !isMobile ? "10px 8px 14px" : "12px 10px 16px", flexShrink: 0 }}>
          <BaseSelector variant="sidebar-premium" collapsed={collapsed && !isMobile} />
        </div>
      </aside>
    </>
  );
}
