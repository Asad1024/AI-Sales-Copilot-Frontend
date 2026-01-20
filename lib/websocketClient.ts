import { io, Socket } from "socket.io-client";
import { getToken, apiRequest } from "./apiClient";

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let cachedWebSocketUrl: string | null = null;

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
  if (socket?.connected) {
    return socket;
  }

  const token = getToken();
  if (!token) {
    console.warn('[WebSocket] No token available, skipping connection');
    return null;
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

  socket.on('connect', () => {
    console.log('[WebSocket] ✅ Connected to notification server');
    reconnectAttempts = 0;
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
    socket.disconnect();
    socket = null;
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
  if (!socket) {
    socket = await initializeWebSocket();
  }

  if (socket) {
    socket.on('notification', callback);
  }
}

/**
 * Remove notification listener
 */
export function offNotification(callback?: (notification: any) => void) {
  if (socket) {
    if (callback) {
      socket.off('notification', callback);
    } else {
      socket.off('notification');
    }
  }
}

