import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Custom hook to connect to Socket.io server
 * Automatically handles connection, authentication, and cleanup
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only create socket once (singleton pattern)
    if (!socket) {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('[Socket] No auth token found, skipping socket connection');
        return;
      }

      console.log('[Socket] Connecting to:', backendUrl);
      
      socket = io(backendUrl, {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
      });

      // Connection event handlers
      socket.on('connect', () => {
        console.log('[Socket] ✅ Connected to server');
        setIsConnected(true);
      });

      socket.on('disconnect', (reason) => {
        console.log('[Socket] ❌ Disconnected:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
        setIsConnected(false);
      });

      socket.on('connected', (data) => {
        console.log('[Socket] Server confirmed connection:', data);
      });

      // Handle reconnection
      socket.on('reconnect', (attemptNumber) => {
        console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`[Socket] Reconnection attempt ${attemptNumber}...`);
      });

      socket.on('reconnect_error', (error) => {
        console.error('[Socket] Reconnection error:', error.message);
      });

      socket.on('reconnect_failed', () => {
        console.error('[Socket] Reconnection failed - max attempts reached');
      });
    }

    // Cleanup function
    return () => {
      // Don't disconnect on component unmount - keep socket alive
      // Socket will be reused by other components
    };
  }, []);

  return socket;
}

/**
 * Disconnect socket manually (useful for logout)
 */
export function disconnectSocket() {
  if (socket) {
    console.log('[Socket] Manually disconnecting...');
    socket.disconnect();
    socket = null;
  }
}

/**
 * Reconnect socket manually (useful after login)
 */
export function reconnectSocket() {
  if (socket && !socket.connected) {
    console.log('[Socket] Manually reconnecting...');
    socket.connect();
  } else if (!socket) {
    console.warn('[Socket] Socket not initialized, please use useSocket hook first');
  }
}
