"use client";
import { useState, useEffect, useRef } from "react";
import { useNotificationStore, Notification } from "@/stores/useNotificationStore";
import { Icons } from "@/components/ui/Icons";

export function NotificationBell() {
  const { unreadCount, notifications, fetchNotifications, markAsRead, markAllAsRead, deleteNotification, refreshUnreadCount } = useNotificationStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications on mount
  useEffect(() => {
    refreshUnreadCount();
    fetchNotifications({ unreadOnly: true });
    
    // Poll for unread count every 60 seconds (WebSocket handles real-time updates)
    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [fetchNotifications, refreshUnreadCount]);

  // Fetch all notifications when dropdown opens
  useEffect(() => {
    if (showDropdown) {
      fetchNotifications({});
    }
  }, [showDropdown, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    setShowDropdown(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'invite':
        return <Icons.Users size={16} />;
      case 'role_change':
        return <Icons.Key size={16} />;
      case 'base_access':
        return <Icons.Shield size={16} />;
      case 'lead_assigned':
        return <Icons.User size={16} />;
      case 'campaign_complete':
        return <Icons.CheckCircle size={16} />;
      default:
        return <Icons.Bell size={16} />;
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          position: 'relative',
          padding: '6px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s',
          color: 'var(--color-text-muted)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-surface-secondary)';
          e.currentTarget.style.color = 'var(--color-text)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-muted)';
        }}
      >
        <Icons.Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              background: '#dc2626',
              color: 'white',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              border: '2px solid var(--color-surface)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          onNotificationClick={handleNotificationClick}
          onMarkAllAsRead={markAllAsRead}
          onDelete={deleteNotification}
          onClose={() => setShowDropdown(false)}
          formatTimeAgo={formatTimeAgo}
          getNotificationIcon={getNotificationIcon}
        />
      )}
    </div>
  );
}

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onNotificationClick: (notification: Notification) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: number) => void;
  onClose: () => void;
  formatTimeAgo: (date: string) => string;
  getNotificationIcon: (type: Notification['type']) => React.ReactNode;
}

function NotificationDropdown({
  notifications,
  unreadCount,
  onNotificationClick,
  onMarkAllAsRead,
  onDelete,
  formatTimeAgo,
  getNotificationIcon,
}: NotificationDropdownProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: '8px',
        width: '400px',
        maxHeight: '600px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            style={{
              padding: '4px 12px',
              background: 'rgba(124, 58, 237, 0.1)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              borderRadius: '6px',
              color: '#7C3AED',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
            }}
          >
            <Icons.Bell size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>No notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() => onNotificationClick(notification)}
              onDelete={() => onDelete(notification.id)}
              formatTimeAgo={formatTimeAgo}
              getNotificationIcon={getNotificationIcon}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onDelete: () => void;
  formatTimeAgo: (date: string) => string;
  getNotificationIcon: (type: Notification['type']) => React.ReactNode;
}

function NotificationItem({
  notification,
  onClick,
  onDelete,
  formatTimeAgo,
  getNotificationIcon,
}: NotificationItemProps) {
  const isUnread = !notification.read_at;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        borderBottom: '1px solid var(--color-border)',
        cursor: 'pointer',
        background: isUnread ? 'rgba(124, 58, 237, 0.05)' : 'transparent',
        transition: 'all 0.2s',
        display: 'flex',
        gap: '12px',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isUnread
          ? 'rgba(124, 58, 237, 0.1)'
          : 'rgba(255, 255, 255, 0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isUnread
          ? 'rgba(124, 58, 237, 0.05)'
          : 'transparent';
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#000',
          flexShrink: 0,
        }}
      >
        {getNotificationIcon(notification.type)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: isUnread ? 600 : 500,
            marginBottom: '4px',
            color: 'var(--color-text)',
          }}
        >
          {notification.title}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: 'var(--color-text-muted)',
            marginBottom: '8px',
            lineHeight: 1.4,
          }}
        >
          {notification.message}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
          }}
        >
          {formatTimeAgo(notification.created_at)}
        </div>
      </div>
      {isUnread && (
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#7C3AED',
            flexShrink: 0,
            marginTop: '4px',
          }}
        />
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          padding: '4px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          opacity: 0.5,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.5';
        }}
      >
        <Icons.X size={14} />
      </button>
    </div>
  );
}

