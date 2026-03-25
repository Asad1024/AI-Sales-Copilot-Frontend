import { create } from "zustand";
import { persist } from "zustand/middleware";

const EXPANDED = 220;
const COLLAPSED = 56;

type SidebarStore = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
};

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
    }),
    { name: "sparkai:sidebar-collapsed" }
  )
);

export const SIDEBAR_WIDTH_EXPANDED = EXPANDED;
export const SIDEBAR_WIDTH_COLLAPSED = COLLAPSED;

export function getSidebarWidthPx(collapsed: boolean, mobile: boolean): number {
  if (mobile) return 0;
  return collapsed ? COLLAPSED : EXPANDED;
}
