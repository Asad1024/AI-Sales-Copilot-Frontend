"use client";
import { useEffect } from "react";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { getToken, isAuthenticated } from "@/lib/apiClient";

/**
 * WebSocket Provider Component
 * Initializes WebSocket connection when user is authenticated
 */
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { initializeWebSocketConnection, cleanup, websocketConnected } = useNotificationStore();

  useEffect(() => {
    // Only initialize if user is signed in and has a token
    if (isAuthenticated() && getToken()) {
      initializeWebSocketConnection();
    } else {
      // Clean up if user signs out
      cleanup();
    }

    // Cleanup on unmount
    return () => {
      if (!isAuthenticated()) {
        cleanup();
      }
    };
  }, [initializeWebSocketConnection, cleanup]);

  // Reconnect if connection drops
  useEffect(() => {
    if (isAuthenticated() && getToken() && !websocketConnected) {
      const timer = setTimeout(() => {
        initializeWebSocketConnection();
      }, 5000); // Retry after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [websocketConnected, initializeWebSocketConnection]);

  return <>{children}</>;
}

