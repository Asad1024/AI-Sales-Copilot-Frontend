import { create } from 'zustand';
import { apiRequest } from '@/lib/apiClient';

export type ColumnType = 'text' | 'number' | 'date' | 'email' | 'phone' | 'url' | 'select' | 'multiselect' | 'single_select' | 'multi_select' | 'checkbox' | 'rating' | 'formula' | 'status';

export interface DropdownOption {
  value?: string; // backward compatibility
  id?: number;
  label: string;
  color?: string;
  display_order?: number;
}

export interface ColumnConfig {
  options?: DropdownOption[] | string[]; // Support both object format (with colors) and string format (backward compatibility)
  min?: number;
  max?: number;
  default?: any;
  required?: boolean;
  formula?: string;
  format?: string;
}

export interface BaseColumn {
  id: number;
  base_id: number;
  name: string;
  type: ColumnType;
  config?: ColumnConfig;
  options?: DropdownOption[]; // for select / multiselect
  display_order: number;
  visible: boolean;
  permissions?: any;
}

interface ColumnCache {
  columns: BaseColumn[];
  timestamp: number;
}

interface ColumnStore {
  columns: BaseColumn[];
  loading: boolean;
  columnCache: Record<number, ColumnCache>; // baseId -> cache
  cacheTimeout: number; // 5 minutes
  
  fetchColumns: (baseId: number, force?: boolean) => Promise<void>;
  createColumn: (column: Partial<BaseColumn>) => Promise<BaseColumn | null>;
  updateColumn: (id: number, updates: Partial<BaseColumn>) => Promise<void>;
  deleteColumn: (id: number) => Promise<void>;
  reorderColumns: (baseId: number, columnOrders: { id: number; display_order: number }[]) => Promise<void>;
  clearCache: (baseId?: number) => void;
}

export const useColumnStore = create<ColumnStore>((set, get) => ({
  columns: [],
  loading: false,
  columnCache: {},
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  
  fetchColumns: async (baseId, force = false) => {
    if (!baseId) {
      set({ columns: [], loading: false });
      return;
    }
    
    // Check cache first
    const state = get();
    const cached = state.columnCache[baseId];
    const now = Date.now();
    
    if (!force && cached && (now - cached.timestamp) < state.cacheTimeout) {
      set({ columns: cached.columns, loading: false });
      return;
    }
    
    set({ loading: true });
    try {
      const data = await apiRequest(`/columns/base/${baseId}`);
      const columns = data?.columns || [];
      set({ 
        columns, 
        loading: false,
        columnCache: {
          ...state.columnCache,
          [baseId]: { columns, timestamp: now }
        }
      });
    } catch (error) {
      console.error('Failed to fetch columns:', error);
      set({ columns: [], loading: false });
    }
  },
  
  clearCache: (baseId) => {
    const state = get();
    if (baseId) {
      const { [baseId]: _, ...rest } = state.columnCache;
      set({ columnCache: rest });
    } else {
      set({ columnCache: {} });
    }
  },
  
  createColumn: async (columnData) => {
    try {
      const data = await apiRequest('/columns', {
        method: 'POST',
        body: JSON.stringify(columnData),
      });
      const newColumn = data?.column;
      if (newColumn) {
        const state = get();
        const baseId = columnData.base_id;
        // Invalidate cache for this base
        if (baseId && state.columnCache[baseId]) {
          state.clearCache(baseId);
        }
        set((state) => ({
          columns: [...state.columns, newColumn].sort((a, b) => a.display_order - b.display_order)
        }));
      }
      return newColumn || null;
    } catch (error: any) {
      console.error('Failed to create column:', error);
      // Re-throw the error so the UI can display it
      const errorMessage = error?.error || error?.message || 'Failed to create column';
      throw new Error(errorMessage);
    }
  },
  
  updateColumn: async (id, updates) => {
    try {
      const state = get();
      const column = state.columns.find(c => c.id === id);
      const baseId = column?.base_id;
      
      const data = await apiRequest(`/columns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      const updatedColumn = data?.column;
      if (updatedColumn) {
        // Invalidate cache for this base
        if (baseId && state.columnCache[baseId]) {
          state.clearCache(baseId);
        }
        set((state) => ({
          columns: state.columns.map(c => 
            c.id === id ? updatedColumn : c
          ).sort((a, b) => a.display_order - b.display_order)
        }));
      }
    } catch (error) {
      console.error('Failed to update column:', error);
      throw error;
    }
  },
  
  deleteColumn: async (id) => {
    try {
      const state = get();
      const column = state.columns.find(c => c.id === id);
      const baseId = column?.base_id;
      
      await apiRequest(`/columns/${id}`, {
        method: 'DELETE',
      });
      
      // Invalidate cache for this base
      if (baseId && state.columnCache[baseId]) {
        state.clearCache(baseId);
      }
      
      set((state) => ({
        columns: state.columns.filter(c => c.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete column:', error);
      throw error;
    }
  },
  
  reorderColumns: async (baseId, columnOrders) => {
    try {
      const data = await apiRequest('/columns/reorder', {
        method: 'POST',
        body: JSON.stringify({ base_id: baseId, column_orders: columnOrders }),
      });
      if (data?.columns) {
        set({ columns: data.columns });
      }
    } catch (error) {
      console.error('Failed to reorder columns:', error);
      throw error;
    }
  },
}));

