import { create } from 'zustand';
import { apiRequest } from '@/lib/apiClient';
import { LEAD_STATUS_STORAGE_KEY } from '@/lib/leadStatus';

export interface Lead {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  score?: number;
  tier?: string;
  company?: string;
  role?: string;
  region?: string;
  industry?: string;
  tags?: any;
  enrichment?: any;
  base_id?: number;
  owner_id?: number;
  assigned_at?: string;
  custom_fields?: Record<string, any>;
  owner?: {
    id: number;
    name: string;
    email: string;
    /** Profile photo when backend includes it (workspace members / lead owner). */
    avatar_url?: string | null;
  };
}

interface LeadFilters {
  search: string;
  segment: string;
  aiFilters: {
    highIntent: boolean;
    recentlyActive: boolean;
    needsFollowUp: boolean;
  };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  groupBy?: string;
  colorBy?: string;
}

interface Pagination {
  currentPage: number;
  leadsPerPage: number;
  totalLeads: number;
  totalPages: number;
}

interface LeadCache {
  leads: Lead[];
  pagination: Pagination;
  timestamp: number;
}

interface LeadStore {
  leads: Lead[];
  loading: boolean;
  filters: LeadFilters;
  pagination: Pagination;
  selectedLeads: number[];
  drawerLead: Lead | null;
  drawerOpen: boolean;
  leadCache: Record<string, LeadCache>; // "baseId:page:limit" -> cache
  cacheTimeout: number; // 2 minutes
  lastFetchKey: string | null; // Track last fetch to avoid duplicate calls
  
  // Actions
  setLeads: (leads: Lead[]) => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<LeadFilters>) => void;
  setPagination: (pagination: Partial<Pagination>) => void;
  setSelectedLeads: (ids: number[] | ((current: number[]) => number[])) => void;
  setDrawerLead: (lead: Lead | null) => void;
  setDrawerOpen: (open: boolean) => void;
  
  // API Actions
  fetchLeads: (
    baseId: number | null,
    page?: number,
    limit?: number,
    force?: boolean,
    opts?: { quiet?: boolean; search?: string }
  ) => Promise<void>;
  createLead: (lead: Partial<Lead>) => Promise<Lead | null>;
  updateLead: (id: number, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: number) => Promise<void>;
  bulkDeleteLeads: (ids: number[]) => Promise<void>;
  clearCache: (baseId?: number) => void;
  /** After refetch, keep the open drawer in sync with the latest row from `leads`. */
  syncDrawerLeadFromRows: () => void;

  // Computed
  getFilteredLeads: () => Lead[];
}

export const useLeadStore = create<LeadStore>((set, get) => ({
  leads: [],
  loading: false,
  filters: {
    search: '',
    segment: 'All',
    aiFilters: {
      highIntent: false,
      recentlyActive: false,
      needsFollowUp: false,
    },
    sortBy: undefined,
    sortOrder: 'asc',
    groupBy: undefined,
    colorBy: undefined,
  },
  pagination: {
    currentPage: 1,
    leadsPerPage: 30,
    totalLeads: 0,
    totalPages: 1,
  },
  selectedLeads: [],
  drawerLead: null,
  drawerOpen: false,
  leadCache: {},
  cacheTimeout: 2 * 60 * 1000, // 2 minutes
  lastFetchKey: null,
  
  setLeads: (leads) => set({ leads }),
  setLoading: (loading) => set({ loading }),
  
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),
  
  setPagination: (pagination) => set((state) => ({
    pagination: { ...state.pagination, ...pagination }
  })),
  
  setSelectedLeads: (ids) => {
    if (typeof ids === 'function') {
      set((state) => {
        const current = Array.isArray(state.selectedLeads) ? state.selectedLeads : [];
        const newValue = ids(current);
        return { selectedLeads: Array.isArray(newValue) ? newValue : [] };
      });
    } else {
      set({ selectedLeads: Array.isArray(ids) ? ids : [] });
    }
  },
  
  setDrawerLead: (lead) => set({ drawerLead: lead }),
  
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  
  clearCache: (baseId) => {
    const state = get();
    if (baseId) {
      // Clear all cache entries for this base
      const newCache: Record<string, LeadCache> = {};
      Object.keys(state.leadCache).forEach(key => {
        if (!key.startsWith(`${baseId}:`)) {
          newCache[key] = state.leadCache[key];
        }
      });
      set({ leadCache: newCache });
    } else {
      set({ leadCache: {} });
    }
  },

  syncDrawerLeadFromRows: () => {
    const { drawerLead, leads } = get();
    if (!drawerLead?.id) return;
    const row = leads.find((l) => l.id === drawerLead.id);
    if (!row) return;
    set({ drawerLead: { ...row } });
  },
  
  fetchLeads: async (baseId, page = 1, limit = 30, force = false, opts) => {
    const quiet = Boolean(opts?.quiet);
    if (!baseId) {
      set({ leads: [], loading: false });
      return;
    }

    const searchQ =
      opts?.search !== undefined
        ? String(opts.search || "").trim()
        : String(get().filters.search || "").trim();

    const fetchKey = `${baseId}:${page}:${limit}:${searchQ}`;
    const state = get();
    let hasStaleCache = false;
    
    // Prevent duplicate concurrent calls
    if (!force && state.lastFetchKey === fetchKey && state.loading) {
      return;
    }

    // Check cache first (stale-while-revalidate).
    if (!force) {
      const cached = state.leadCache[fetchKey];
      const now = Date.now();
      
      if (cached) {
        set({
          leads: cached.leads,
          pagination: cached.pagination,
          loading: false,
          lastFetchKey: fetchKey
        });
        if ((now - cached.timestamp) < state.cacheTimeout) {
          return;
        }
        hasStaleCache = true;
      }
    }

    const quietRefresh = quiet || hasStaleCache;
    if (quietRefresh) {
      set({ lastFetchKey: fetchKey });
    } else {
      set({ loading: true, lastFetchKey: fetchKey });
    }
    try {
      const params = new URLSearchParams({
        base_id: String(baseId),
        page: String(page),
        limit: String(limit),
      });
      if (searchQ) {
        params.set("search", searchQ);
      }
      if (force) {
        params.append("_cb", String(Date.now()));
      }

      const data = await apiRequest(`/leads?${params}`);
      const leadsList = data?.leads || [];
      const pagination = data?.pagination || {
        total: 0,
        page: 1,
        limit: 30,
        totalPages: 1,
      };
      
      const paginationState = {
        currentPage: pagination.page || page,
        leadsPerPage: pagination.limit || limit,
        totalLeads: pagination.total || 0,
        totalPages: pagination.totalPages || 1,
      };
      
      // Update cache
      set((state) => ({
        leads: leadsList,
        loading: quietRefresh ? state.loading : false,
        pagination: paginationState,
        leadCache: {
          ...state.leadCache,
          [fetchKey]: {
            leads: leadsList,
            pagination: paginationState,
            timestamp: Date.now()
          }
        }
      }));
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      set((state) => ({
        leads: quietRefresh ? state.leads : [],
        loading: quietRefresh ? state.loading : false,
        lastFetchKey: null,
      }));
    }
  },
  
  createLead: async (leadData) => {
    try {
      const data = await apiRequest('/leads', {
        method: 'POST',
        body: JSON.stringify(leadData),
      });
      const newLead = data?.lead || data;
      const state = get();
      // Invalidate cache for this base
      if (leadData.base_id) {
        state.clearCache(leadData.base_id);
      }
      set((state) => ({
        leads: [newLead, ...state.leads]
      }));
      return newLead;
    } catch (error) {
      console.error('Failed to create lead:', error);
      return null;
    }
  },
  
  updateLead: async (id, updates) => {
    try {
      const state = get();
      const lead = state.leads.find(l => l.id === id);
      
      await apiRequest(`/leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      // Invalidate cache for this base
      if (lead?.base_id) {
        state.clearCache(lead.base_id);
      }
      
      set((state) => ({
        leads: state.leads.map(l => 
          l.id === id ? { ...l, ...updates } : l
        )
      }));
    } catch (error) {
      console.error('Failed to update lead:', error);
      throw error;
    }
  },
  
  deleteLead: async (id) => {
    try {
      const state = get();
      const lead = state.leads.find(l => l.id === id);
      
      await apiRequest(`/leads/${id}`, {
        method: 'DELETE',
      });
      
      // Invalidate cache for this base
      if (lead?.base_id) {
        state.clearCache(lead.base_id);
      }
      
      set((state) => ({
        leads: state.leads.filter(l => l.id !== id),
        selectedLeads: Array.isArray(state.selectedLeads) ? state.selectedLeads.filter(lid => lid !== id) : [],
      }));
    } catch (error) {
      console.error('Failed to delete lead:', error);
      throw error;
    }
  },
  
  bulkDeleteLeads: async (ids) => {
    try {
      const state = get();
      const leadsToDelete = state.leads.filter(l => ids.includes(l.id));
      const baseIds = new Set(leadsToDelete.map(l => l.base_id).filter(Boolean));
      
      // Get base_id from the first lead (all leads should be from the same base)
      const baseId = leadsToDelete.length > 0 ? leadsToDelete[0].base_id : null;
      
      if (!baseId) {
        throw new Error('Unable to determine base_id for selected leads');
      }
      
      await apiRequest('/leads/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ lead_ids: ids, base_id: baseId }),
      });
      
      // Invalidate cache for affected bases
      baseIds.forEach(baseId => {
        if (baseId) state.clearCache(baseId);
      });
      
      set((state) => ({
        leads: state.leads.filter(l => !ids.includes(l.id)),
        selectedLeads: [],
      }));
    } catch (error) {
      console.error('Failed to bulk delete leads:', error);
      throw error;
    }
  },
  
  getFilteredLeads: () => {
    const { leads, filters } = get();
    let filtered = leads.filter((lead) => {
      // Search is applied server-side in GET /leads (all pages); do not filter again here.

      // Segment filtering
      if (filters.segment !== "All") {
        if (filters.segment === "Hot" && lead.tier !== "Hot") return false;
        if (filters.segment === "Warm" && lead.tier !== "Warm") return false;
        if (filters.segment === "Cold" && lead.tier !== "Cold") return false;
      }

      // AI filters
      if (filters.aiFilters.highIntent && (!lead.score || lead.score < 70)) return false;
      if (filters.aiFilters.recentlyActive && !lead.enrichment?.recent_activity) return false;
      if (filters.aiFilters.needsFollowUp && !lead.enrichment?.needs_followup) return false;

      return true;
    });

    // Apply sorting
    if (filters.sortBy) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (filters.sortBy) {
          case 'name':
            aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
            bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
            break;
          case 'email':
            aValue = (a.email || '').toLowerCase();
            bValue = (b.email || '').toLowerCase();
            break;
          case 'company':
            aValue = (a.company || '').toLowerCase();
            bValue = (b.company || '').toLowerCase();
            break;
          case 'score':
            aValue = a.score ?? 0;
            bValue = b.score ?? 0;
            break;
          case 'tier':
            aValue = a.tier || '';
            bValue = b.tier || '';
            break;
          case 'owner':
            aValue = a.owner?.name || '';
            bValue = b.owner?.name || '';
            break;
          case 'lead_status':
            aValue = String(a.custom_fields?.[LEAD_STATUS_STORAGE_KEY] ?? '').toLowerCase();
            bValue = String(b.custom_fields?.[LEAD_STATUS_STORAGE_KEY] ?? '').toLowerCase();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
        const aid = a.id ?? 0;
        const bid = b.id ?? 0;
        if (aid !== bid) {
          return filters.sortOrder === 'asc' ? aid - bid : bid - aid;
        }
        return 0;
      });
    }

    return filtered;
  },
}));
