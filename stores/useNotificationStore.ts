import { create } from 'zustand';
import { apiRequest } from '@/lib/apiClient';
import { initializeWebSocket, onNotification, offNotification, disconnectWebSocket } from '@/lib/websocketClient';

export interface Notification {
  id: number;
  user_id: number;
  type: 'invite' | 'role_change' | 'base_access' | 'campaign_complete' | 'lead_assigned' | 'enrichment_completed' | 'system';
  title: string;
  message: string;
  metadata?: any;
  read_at: string | null;
  email_sent: boolean;
  created_at: string;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  websocketConnected: boolean;
  
  // Actions
  fetchNotifications: (opts?: { unreadOnly?: boolean; search?: string; type?: string; limit?: number; offset?: number }) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  initializeWebSocketConnection: () => Promise<void>;
  cleanup: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  websocketConnected: false,

  fetchNotifications: async (opts) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (opts?.unreadOnly) params.set("unread_only", "true");
      if (opts?.search?.trim()) params.set("search", opts.search.trim());
      if (opts?.type && opts.type !== "all") params.set("type", opts.type);
      if (opts?.limit != null) params.set("limit", String(opts.limit));
      if (opts?.offset != null) params.set("offset", String(opts.offset));
      const qs = params.toString();
      const data = await apiRequest(`/notifications${qs ? `?${qs}` : ""}`);
      set({
        notifications: data.notifications || [],
        unreadCount: data.unread_count || 0,
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      console.error('Failed to fetch notifications:', error);
    }
  },

  markAsRead: async (id: number) => {
    try {
      const prev = get().notifications.find((n) => n.id === id);
      const wasUnread = Boolean(prev && !prev.read_at);
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        ),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      }));
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH' });
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          read_at: n.read_at || new Date().toISOString(),
        })),
        unreadCount: 0,
      }));
      await get().refreshUnreadCount();
    } catch (error: any) {
      console.error('Failed to mark all as read:', error);
    }
  },

  deleteNotification: async (id: number) => {
    try {
      await apiRequest(`/notifications/${id}`, { method: 'DELETE' });
      const notification = get().notifications.find((n) => n.id === id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: notification && !notification.read_at
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      }));
    } catch (error: any) {
      console.error('Failed to delete notification:', error);
    }
  },

  refreshUnreadCount: async () => {
    try {
      const data = await apiRequest('/notifications/unread-count');
      set({ unreadCount: data.unread_count || 0 });
    } catch (error: any) {
      console.error('Failed to refresh unread count:', error);
    }
  },

  initializeWebSocketConnection: async () => {
    try {
      // Initialize WebSocket connection
      await initializeWebSocket();
      
      // Set up notification listener
      await onNotification((notification: Notification) => {
        console.log('[Notification Store] Received real-time notification:', notification);
        
        // Add notification to the list if not already present
        set((state) => {
          const exists = state.notifications.some((n) => n.id === notification.id);
          if (exists) {
            // Update existing notification
            return {
              notifications: state.notifications.map((n) =>
                n.id === notification.id ? notification : n
              ),
              unreadCount: notification.read_at ? state.unreadCount : state.unreadCount + 1,
              websocketConnected: true,
            };
          } else {
            // Add new notification
            return {
              notifications: [notification, ...state.notifications],
              unreadCount: notification.read_at ? state.unreadCount : state.unreadCount + 1,
              websocketConnected: true,
            };
          }
        });
      });

      set({ websocketConnected: true });
      console.log('[Notification Store] WebSocket connection initialized');
    } catch (error: any) {
      console.error('[Notification Store] Failed to initialize WebSocket:', error);
      set({ websocketConnected: false });
    }
  },

  cleanup: () => {
    offNotification();
    disconnectWebSocket();
    set({ websocketConnected: false });
  },
}));

