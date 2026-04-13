"use client";
import React, { createContext, useContext, useEffect, useMemo, useCallback } from "react";
import { getToken, isAuthenticated } from "@/lib/apiClient";
import { useBaseStore } from "@/stores/useBaseStore";

type Base = { id: number; name: string };

type BaseContextType = {
  bases: Base[];
  activeBaseId: number | null;
  setActiveBaseId: (id: number | null, options?: { name?: string }) => void;
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

  const setActiveBaseId = useCallback((id: number | null, options?: { name?: string }) => {
    setActiveBaseIdStore(id, options);
  }, [setActiveBaseIdStore]);

  const refreshBases = useCallback(async () => {
    const token = getToken();
    if (!token) {
      return;
    }
    try {
      await refreshBasesStore();
    } catch (error: unknown) {
      console.error("[BaseContext] Failed to fetch bases:", error);
    }
  }, [refreshBasesStore]);

  useEffect(() => {
    const runIfAuthed = () => {
      if (!isAuthenticated() || !getToken()) {
        return;
      }
      void refreshBases();
    };

    runIfAuthed();

    /** Login/signup/OAuth set user after token; layout does not remount, so we must refetch here. */
    window.addEventListener("sparkai:user-changed", runIfAuthed);

    const interval = setInterval(runIfAuthed, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("sparkai:user-changed", runIfAuthed);
      clearInterval(interval);
    };
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


