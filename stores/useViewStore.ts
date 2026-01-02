import { create } from 'zustand';
import { apiRequest } from '@/lib/apiClient';

export interface ViewFilters {
  search?: string;
  segment?: string;
  tier?: string;
  score?: {
    min?: number;
    max?: number;
  };
  owner_id?: number;
  customFields?: Record<string, any>;
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  colorBy?: string;
  aiFilters?: {
    highIntent?: boolean;
    recentlyActive?: boolean;
    needsFollowUp?: boolean;
  };
}

export interface ViewSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface BaseView {
  id: number;
  base_id: number;
  name: string;
  filters: ViewFilters;
  sort?: ViewSort;
  visible_columns?: string[];
  created_by: number;
  is_shared: boolean;
  is_default: boolean;
}

interface ViewStore {
  views: BaseView[];
  activeViewId: number | null;
  loading: boolean;
  
  fetchViews: (baseId: number) => Promise<void>;
  createView: (view: Partial<BaseView>) => Promise<BaseView | null>;
  updateView: (id: number, updates: Partial<BaseView>) => Promise<void>;
  deleteView: (id: number) => Promise<void>;
  setActiveView: (id: number | null) => void;
  getActiveView: () => BaseView | undefined;
}

export const useViewStore = create<ViewStore>((set, get) => ({
  views: [],
  activeViewId: null,
  loading: false,
  
  fetchViews: async (baseId) => {
    if (!baseId) {
      set({ views: [], loading: false });
      return;
    }
    
    set({ loading: true });
    try {
      const data = await apiRequest(`/views/base/${baseId}`);
      const viewsList = data?.views || [];
      set({ views: viewsList, loading: false });
      
      // Set default view as active if no active view
      if (!get().activeViewId && viewsList.length > 0) {
        const defaultView = viewsList.find((v: BaseView) => v.is_default);
        if (defaultView) {
          set({ activeViewId: defaultView.id });
        }
      }
    } catch (error) {
      console.error('Failed to fetch views:', error);
      set({ views: [], loading: false });
    }
  },
  
  createView: async (viewData) => {
    try {
      const data = await apiRequest('/views', {
        method: 'POST',
        body: JSON.stringify(viewData),
      });
      const newView = data?.view;
      if (newView) {
        set((state) => ({
          views: [...state.views, newView]
        }));
      }
      return newView || null;
    } catch (error) {
      console.error('Failed to create view:', error);
      return null;
    }
  },
  
  updateView: async (id, updates) => {
    try {
      const data = await apiRequest(`/views/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      const updatedView = data?.view;
      if (updatedView) {
        set((state) => ({
          views: state.views.map(v => 
            v.id === id ? updatedView : v
          )
        }));
      }
    } catch (error) {
      console.error('Failed to update view:', error);
      throw error;
    }
  },
  
  deleteView: async (id) => {
    try {
      await apiRequest(`/views/${id}`, {
        method: 'DELETE',
      });
      set((state) => ({
        views: state.views.filter(v => v.id !== id),
        activeViewId: state.activeViewId === id ? null : state.activeViewId
      }));
    } catch (error) {
      console.error('Failed to delete view:', error);
      throw error;
    }
  },
  
  setActiveView: (id) => set({ activeViewId: id }),
  
  getActiveView: () => {
    const { views, activeViewId } = get();
    return views.find(v => v.id === activeViewId);
  },
}));

