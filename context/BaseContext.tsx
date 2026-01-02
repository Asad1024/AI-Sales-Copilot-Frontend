"use client";
import React, { createContext, useContext, useEffect, useMemo, useCallback, useRef } from "react";
import { getToken, isAuthenticated } from "@/lib/apiClient";
import { useBaseStore } from "@/stores/useBaseStore";

type Base = { id: number; name: string };

type BaseContextType = {
  bases: Base[];
  activeBaseId: number | null;
  setActiveBaseId: (id: number | null) => void;
  refreshBases: () => Promise<void>;
};

// Create default context value to prevent undefined errors
const defaultContextValue: BaseContextType = {
  bases: [],
  activeBaseId: null,
  setActiveBaseId: () => {},
  refreshBases: async () => {}
};

const BaseContext = createContext<BaseContextType>(defaultContextValue);

// Internal component that uses hooks
function BaseProviderInner({ children }: { children: React.ReactNode }) {
  // Use Zustand store as the source of truth
  const { 
    bases, 
    activeBaseId, 
    setActiveBaseId: setActiveBaseIdStore, 
    refreshBases: refreshBasesStore 
  } = useBaseStore();
  
  const isRefreshingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const setActiveBaseId = useCallback((id: number | null) => {
    setActiveBaseIdStore(id);
  }, [setActiveBaseIdStore]);

  const refreshBases = useCallback(async () => {
    // Prevent concurrent refreshes
    if (isRefreshingRef.current) {
      return Promise.resolve();
    }
    
    // Check if we have a token before making the request
    const token = getToken();
    if (!token) {
      console.log("[BaseContext] No token available, skipping bases fetch");
      return;
    }
    
    try {
      isRefreshingRef.current = true;
      await refreshBasesStore();
    } catch (error: any) {
      console.error("[BaseContext] Failed to fetch bases:", error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [refreshBasesStore]);

  useEffect(() => {
    // Only fetch if user is authenticated via our JWT token.
    if (!isAuthenticated() || !getToken()) {
      hasInitializedRef.current = false;
      return;
    }

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      refreshBases();
    }

    // Auto-refresh bases every 5 minutes
    const interval = setInterval(() => {
      if (isAuthenticated() && getToken()) {
        refreshBases();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshBases]);

  const value = useMemo(() => ({ 
    bases, 
    activeBaseId, 
    setActiveBaseId, 
    refreshBases 
  }), [bases, activeBaseId, setActiveBaseId, refreshBases]);
  
  return <BaseContext.Provider value={value}>{children}</BaseContext.Provider>;
}

// Export wrapper that doesn't use hooks
export function BaseProvider({ children }: { children: React.ReactNode }) {
  return <BaseProviderInner>{children}</BaseProviderInner>;
}

export function useBase() {
  const ctx = useContext(BaseContext);
  // Check if we're using the default context (provider not in tree)
  // We check by comparing function references since they're recreated in the provider
  if (ctx.setActiveBaseId === defaultContextValue.setActiveBaseId) {
    throw new Error("useBase must be used within BaseProvider");
  }
  return ctx;
}


