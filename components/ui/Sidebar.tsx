"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icons } from "./Icons";
import { getUser, apiRequest } from "@/lib/apiClient";
import { useBaseStore } from "@/stores/useBaseStore";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ReactElement;
  highlight?: boolean;
  badge?: number;
}

export default function Sidebar({ isOpen, onClose, collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [globalStats, setGlobalStats] = useState<{ totalLeads: number; activeCampaigns: number; leadChange: number; replyRate?: number } | null>(null);

  // Only access localStorage on client side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setUser(getUser());
    setIsMobile(window.innerWidth <= 768);
  }, []);

  // Fetch global stats for Quick Stats
  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const data = await apiRequest("/analytics/global");
        setGlobalStats(data);
      } catch (error) {
        // Silently fail - stats will show placeholder
      }
    };
    fetchGlobalStats();
    const interval = setInterval(fetchGlobalStats, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  const { activeBaseId } = useBaseStore();
  
  const baseNavigationItems: NavigationItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: <Icons.Dashboard /> },
    { href: '/bases', label: 'Workspaces', icon: <Icons.Folder /> },
    { href: activeBaseId ? `/bases/${activeBaseId}/leads` : '/leads', label: 'Leads', icon: <Icons.Users /> },
    { href: '/campaigns', label: 'Campaigns', icon: <Icons.Rocket /> },
    { href: '/templates', label: 'Templates', icon: <Icons.FileText /> },
    { href: '/reports', label: 'Reports', icon: <Icons.Chart /> },
    { href: '/team', label: 'Team', icon: <Icons.UserPlus /> },
    { href: '/settings', label: 'Settings', icon: <Icons.Settings /> },
  ];

  const navigationItems: NavigationItem[] = mounted && user?.role === "admin" 
    ? [...baseNavigationItems, { href: '/admin', label: 'Admin', icon: <Icons.Shield />, highlight: true }]
    : baseNavigationItems;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href.startsWith('/bases/') && href.includes('/leads')) {
      return pathname.startsWith('/bases/') && pathname.includes('/leads');
    }
    return pathname.startsWith(href) && href !== '/';
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) onClose();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onClose]);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 25,
            display: 'block'
          }}
        />
      )}

      {/* Sidebar */}
      <aside 
        style={{
          position: 'fixed',
          top: '72px',
          left: 0,
          width: collapsed ? '72px' : '260px',
          height: 'calc(100vh - 72px)',
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          transition: 'all 0.25s ease',
          zIndex: 30,
          overflowY: 'auto',
          overflowX: 'hidden',
          transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)'
        }}
      >
        <div style={{ padding: collapsed ? '16px 12px' : '20px 16px' }}>
          {/* Collapse Toggle */}
          <div style={{ 
            display: 'flex', 
            justifyContent: collapsed ? 'center' : 'flex-end', 
            marginBottom: '20px' 
          }}>
            <button
              onClick={onToggle}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-secondary)',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <Icons.ChevronRight size={16} /> : <Icons.ChevronLeft size={16} />}
            </button>
          </div>

          {/* Navigation */}
          <nav>
            {!collapsed && (
              <div style={{ 
                fontSize: 11, 
                fontWeight: 600, 
                color: 'var(--color-text-muted)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                marginBottom: 12,
                paddingLeft: 12
              }}>
                Menu
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {navigationItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour={
                      item.href === '/campaigns' ? 'campaigns-link' :
                      item.href.includes('/leads') ? 'leads-link' :
                      item.href === '/templates' ? 'templates-link' :
                      item.href === '/bases' ? 'bases-selector' :
                      undefined
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      gap: 12,
                      padding: collapsed ? '12px' : '10px 12px',
                      borderRadius: 10,
                      color: active ? '#4C67FF' : item.highlight ? '#fff' : 'var(--color-text)',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      background: active
                        ? 'rgba(76, 103, 255, 0.1)'
                        : item.highlight
                          ? 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)'
                          : 'transparent',
                      border: active ? '1px solid rgba(76, 103, 255, 0.25)' : '1px solid transparent',
                      fontSize: 14,
                      fontWeight: active ? 600 : 500
                    }}
                  >
                    <span style={{ display: 'inline-flex', flexShrink: 0 }}>{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && item.badge && item.badge > 0 && (
                      <span style={{
                        marginLeft: 'auto',
                        background: '#4C67FF',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 10
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Quick Stats */}
          {!collapsed && (
            <div style={{ marginTop: 24 }}>
              <div style={{ 
                fontSize: 11, 
                fontWeight: 600, 
                color: 'var(--color-text-muted)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                marginBottom: 12,
                paddingLeft: 12
              }}>
                Overview
              </div>
              <div style={{ 
                background: 'var(--color-surface-secondary)', 
                borderRadius: 12, 
                padding: 14,
                border: '1px solid var(--color-border)'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#4C67FF' }}>
                      {globalStats ? formatNumber(globalStats.totalLeads) : '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Total Leads</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#A94CFF' }}>
                      {globalStats ? globalStats.activeCampaigns : '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Campaigns</div>
                  </div>
                </div>
                {globalStats && globalStats.leadChange !== 0 && (
                  <div style={{ 
                    marginTop: 10, 
                    paddingTop: 10, 
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12
                  }}>
                    {globalStats.leadChange > 0 ? (
                      <Icons.TrendingUp size={14} style={{ color: '#10b981' }} />
                    ) : (
                      <Icons.TrendingDown size={14} style={{ color: '#ef4444' }} />
                    )}
                    <span style={{ color: globalStats.leadChange > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {globalStats.leadChange > 0 ? '+' : ''}{globalStats.leadChange.toFixed(1)}%
                    </span>
                    <span style={{ color: 'var(--color-text-muted)' }}>vs last period</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {!collapsed && (
            <div style={{ marginTop: 24 }}>
              <div style={{ 
                fontSize: 11, 
                fontWeight: 600, 
                color: 'var(--color-text-muted)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                marginBottom: 12,
                paddingLeft: 12
              }}>
                Quick Actions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  onClick={() => router.push('/campaigns/new')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(76, 103, 255, 0.2)',
                    background: 'rgba(76, 103, 255, 0.06)',
                    color: '#4C67FF',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icons.Plus size={16} />
                  <span>New Campaign</span>
                </button>
                <button
                  onClick={() => {
                    if (activeBaseId) {
                      router.push(`/bases/${activeBaseId}/leads`);
                    } else {
                      router.push('/bases');
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-secondary)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icons.Upload size={16} />
                  <span>Import Leads</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
