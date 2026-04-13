import { io, Socket } from "socket.io-client";
import { getToken, apiRequest } from "./apiClient";

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let cachedWebSocketUrl: string | null = null;
let activeBaseListenerBound = false;

function getStoredActiveBaseId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem("sparkai:active_base_id");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function ensureActiveBaseWorkspaceBinding() {
  if (typeof window === "undefined" || activeBaseListenerBound) return;
  activeBaseListenerBound = true;
  window.addEventListener("sparkai:active-base-changed", () => {
    syncWebSocketWorkspaceRoom(getStoredActiveBaseId());
  });
}

/**
 * Join or leave the server `base:{id}` room so workspace notifications (e.g. enrichment) reach teammates.
 * Safe to call before the socket exists; no-ops when disconnected.
 */
export function syncWebSocketWorkspaceRoom(baseId: number | null): void {
  if (!socket?.connected) return;
  socket.emit("join_workspace", { base_id: baseId });
}

/** Many features register `notification` handlers; socket.io replaces the client on reconnect — fan out from one relay. */
const notificationListeners = new Set<(notification: unknown) => void>();

function fanOutNotification(notification: unknown) {
  notificationListeners.forEach((cb) => {
    try {
      cb(notification);
    } catch (e) {
      console.error("[WebSocket] notification listener error:", e);
    }
  });
}

function bindNotificationRelay(sock: Socket | null) {
  if (!sock) return;
  sock.off("notification", fanOutNotification);
  sock.on("notification", fanOutNotification);
}

/**
 * Get WebSocket URL from backend API
 * Uses WEBHOOK_BASE_URL from backend for consistency
 */
async function getWebSocketUrl(): Promise<string> {
  // Return cached URL if available
  if (cachedWebSocketUrl) {
    return cachedWebSocketUrl;
  }

  try {
    // Fetch WebSocket URL from backend (uses WEBHOOK_BASE_URL)
    const config = await apiRequest('/config/websocket-url');
    const wsUrl = config.websocket_url || '';
    if (wsUrl) {
      cachedWebSocketUrl = wsUrl;
      return wsUrl;
    }
  } catch (error) {
    console.warn('[WebSocket] Failed to get URL from backend, using fallback');
  }
  
  // Fallback: construct from API URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const wsUrl = apiUrl.replace(/^http/, 'ws');
  cachedWebSocketUrl = wsUrl;
  return wsUrl;
}

/**
 * Initialize WebSocket connection
 */
export async function initializeWebSocket(): Promise<Socket | null> {
  const token = getToken();
  if (!token) {
    console.warn('[WebSocket] No token available, skipping connection');
    return null;
  }

  ensureActiveBaseWorkspaceBinding();

  if (socket?.connected) {
    bindNotificationRelay(socket);
    syncWebSocketWorkspaceRoom(getStoredActiveBaseId());
    return socket;
  }

  /** Reuse the same client instance so `notification` listeners survive reconnects (do not orphan handlers with a second `io()`). */
  if (socket && !socket.connected) {
    bindNotificationRelay(socket);
    socket.connect();
    return socket;
  }

  const wsUrl = await getWebSocketUrl();
  
  if (!wsUrl) {
    console.error('[WebSocket] No WebSocket URL available');
    return null;
  }
  
  console.log(`[WebSocket] Connecting to ${wsUrl}`);

  socket = io(wsUrl, {
    auth: {
      token: token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    timeout: 20000,
  });

  bindNotificationRelay(socket);

  socket.on('connect', () => {
    console.log('[WebSocket] ✅ Connected to notification server');
    reconnectAttempts = 0;
    bindNotificationRelay(socket);
    syncWebSocketWorkspaceRoom(getStoredActiveBaseId());
  });

  socket.on('disconnect', (reason: string) => {
    console.log('[WebSocket] ❌ Disconnected:', reason);
    if (reason === 'io server disconnect') {
      // Server disconnected, reconnect manually
      socket?.connect();
    }
  });

  socket.on('connect_error', (error: Error) => {
    reconnectAttempts++;
    console.error(`[WebSocket] Connection error (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}):`, error.message);
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[WebSocket] Max reconnection attempts reached. Please refresh the page.');
    }
  });

  socket.on('connected', (data: any) => {
    console.log('[WebSocket] Server confirmed connection:', data);
  });

  socket.on('pong', () => {
    // Connection is alive
  });

  return socket;
}

/**
 * Get the current WebSocket connection
 */
export function getWebSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect WebSocket
 */
export function disconnectWebSocket() {
  if (socket) {
    socket.off("notification", fanOutNotification);
    socket.disconnect();
    socket = null;
    notificationListeners.clear();
    console.log('[WebSocket] Disconnected');
  }
}

/**
 * Check if WebSocket is connected
 */
export function isWebSocketConnected(): boolean {
  return socket?.connected || false;
}

/**
 * Listen for notifications
 */
export async function onNotification(callback: (notification: any) => void) {
  notificationListeners.add(callback);
  const s = await initializeWebSocket();
  if (s) {
    bindNotificationRelay(s);
  }
}

/**
 * Remove notification listener
 */
export function offNotification(callback?: (notification: any) => void) {
  if (callback) {
    notificationListeners.delete(callback);
    return;
  }
  notificationListeners.clear();
}

