import { create } from 'zustand';
import { apiRequest } from '@/lib/apiClient';

export interface Base {
  id: number;
  name: string;
  user_id: number;
  purpose?: string;
  target_audience?: string;
  icp_context?: any;
  enrichment_status?: any;
  created_at?: string;
  updated_at?: string;
}

interface BaseStore {
  bases: Base[];
  activeBaseId: number | null;
  loading: boolean;
  
  setBases: (bases: Base[]) => void;
  setActiveBaseId: (id: number | null) => void;
  setLoading: (loading: boolean) => void;
  refreshBases: () => Promise<void>;
  getActiveBase: () => Base | undefined;
}

export const useBaseStore = create<BaseStore>((set, get) => ({
  bases: [],
  activeBaseId: null,
  loading: false,
  
  setBases: (bases) => set({ bases }),
  
  setActiveBaseId: (id) => {
    set({ activeBaseId: id });
    if (typeof window !== 'undefined') {
      // Update localStorage
      if (id === null) {
        localStorage.removeItem("sparkai:active_base_id");
      } else {
        localStorage.setItem("sparkai:active_base_id", String(id));
      }
      
      // Update URL if we're on a base-scoped route
      const pathname = window.location.pathname;
      if (pathname.startsWith('/bases/') && id) {
        const pathParts = pathname.split('/');
        const currentBaseId = pathParts[2];
        if (currentBaseId && currentBaseId !== String(id)) {
          // Replace base ID in URL
          const route = pathParts.slice(3).join('/'); // Everything after /bases/[id]/
          const newPath = `/bases/${id}${route ? `/${route}` : ''}`;
          window.history.replaceState({}, '', newPath);
        }
      }
    }
  },
  
  setLoading: (loading) => set({ loading }),
  
  refreshBases: async () => {
    set({ loading: true });
    try {
      const data = await apiRequest('/bases');
      const basesList = Array.isArray(data?.bases) ? data.bases : (Array.isArray(data) ? data : []);
      set({ bases: basesList, loading: false });
      
      // Restore active base from localStorage if not set
      if (typeof window !== 'undefined' && !get().activeBaseId) {
        const stored = localStorage.getItem("sparkai:active_base_id");
        if (stored && basesList.find((b: Base) => b.id === Number(stored))) {
          set({ activeBaseId: Number(stored) });
        } else if (basesList.length > 0) {
          set({ activeBaseId: basesList[0].id });
        }
      }
    } catch (error) {
      console.error('Failed to fetch bases:', error);
      set({ bases: [], loading: false });
    }
  },
  
  getActiveBase: () => {
    const { bases, activeBaseId } = get();
    return bases.find(b => b.id === activeBaseId);
  },
}));

