"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Icons } from "./Icons";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function AdminSidebar({ isOpen, onClose, collapsed = false, onToggle }: AdminSidebarProps) {
  const [activeItem, setActiveItem] = useState("/admin");
  const [isMobile, setIsMobile] = useState(false);

  const adminNavigationItems = [
    { href: '/admin', label: 'Admin Dashboard', icon: <Icons.Dashboard /> },
    { href: '/admin/users', label: 'User Management', icon: <Icons.Users /> },
    { href: '/admin/settings', label: 'System Settings', icon: <Icons.Settings /> },
    { href: '/admin/logs', label: 'Activity Logs', icon: <Icons.FileText /> },
    { href: '/dashboard', label: '← Back to Dashboard', icon: <Icons.Dashboard />, highlight: true }
  ];

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        onClose();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onClose]);

  useEffect(() => {
    const path = window.location.pathname;
    setActiveItem(path);
  }, []);

  return (
    <>
      {isMobile && isOpen && (
        <div 
          className="sidebar-overlay"
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

      <aside 
        className={`sidebar ${isOpen || !isMobile ? 'open' : 'closed'} ${collapsed ? 'collapsed' : 'expanded'}`}
        style={{
          position: 'fixed',
          top: '72px',
          left: 0,
          width: collapsed ? '80px' : '280px',
          height: 'calc(100vh - 72px)',
          background: 'var(--color-surface)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--color-border)',
          transition: 'all 0.3s ease',
          zIndex: 30,
          overflowY: 'auto',
          transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
          boxShadow: '2px 0 8px var(--color-shadow)'
        }}
      >
        <div style={{ padding: '24px 16px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            marginBottom: '24px' 
          }}>
            <button
              onClick={onToggle}
              className="sidebar-toggle-btn-enhanced"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="sidebar-toggle-icon" style={{ 
                transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)'
              }}>
                {collapsed ? <Icons.ChevronRight size={20} /> : <Icons.ChevronLeft size={20} />}
              </span>
            </button>
          </div>

          {!collapsed && (
            <div style={{
              background: 'linear-gradient(135deg, #A94CFF 0%, #4C67FF 100%)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>ADMIN PANEL</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>System Control</div>
            </div>
          )}

          <nav style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: 'var(--color-text-muted)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              marginBottom: '16px',
              display: collapsed ? 'none' : 'block'
            }}>
              Administration
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {adminNavigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setActiveItem(item.href)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    color: activeItem === item.href || item.highlight ? '#4C67FF' : 'var(--color-text)',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease',
                    background: activeItem === item.href 
                      ? 'rgba(76, 103, 255, 0.10)'
                      : item.highlight
                        ? 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)'
                        : 'var(--color-surface-secondary)',
                    border: activeItem === item.href 
                      ? '1px solid rgba(76, 103, 255, 0.30)'
                      : item.highlight
                        ? '1px solid transparent'
                        : '1px solid var(--color-border)',
                    fontSize: '14px',
                    fontWeight: '500',
                    boxShadow: item.highlight ? '0 4px 12px rgba(76, 103, 255, 0.3)' : 'none'
                  }}
                >
                  <span style={{ display: 'inline-flex', minWidth: '20px' }} aria-hidden="true">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}

