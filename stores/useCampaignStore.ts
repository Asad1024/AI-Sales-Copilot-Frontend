import { create } from 'zustand';
import { apiRequest } from '@/lib/apiClient';

export interface Campaign {
  id: number;
  name: string;
  channel: 'email' | 'linkedin' | 'whatsapp' | 'call';
  status: 'running' | 'paused' | 'draft' | 'completed';
  base_id: number;
  leads?: number;
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  replied?: number;
  converted?: number;
  openRate?: number;
  replyRate?: number;
  clickRate?: number;
  conversionRate?: number;
  whatsapp_sent?: number;
  whatsapp_delivered?: number;
  whatsapp_seen?: number;
  whatsapp_replied?: number;
  whatsapp_skipped?: number;
  whatsapp_no_whatsapp?: number;
  whatsapp_delivery_rate?: string;
  whatsapp_read_rate?: string;
  whatsapp_reply_rate?: string;
  linkedin_invitations_sent?: number;
  linkedin_invitations_failed?: number;
  linkedin_invitations_skipped?: number;
  linkedin_invitations_accepted?: number;
  // Call campaign metrics
  call_initiated?: number;
  call_answered?: number;
  call_completed?: number;
  call_not_answered?: number;
  call_answer_rate?: string;
  call_completion_rate?: string;
  created_at?: string;
  updated_at?: string;
  ai_insight?: string;
  tier_filter?: string;
  channels?: string[];
}

interface CampaignFilters {
  search: string;
  status: 'all' | 'running' | 'paused' | 'draft' | 'completed';
  channel: 'all' | 'email' | 'linkedin' | 'whatsapp' | 'call';
}

interface CampaignCacheEntry {
  campaigns: Campaign[];
  timestamp: number;
}

interface CampaignStore {
  campaigns: Campaign[];
  loading: boolean;
  filters: CampaignFilters;
  campaignCache: Record<number, CampaignCacheEntry>;
  cacheTimeout: number;
  setCampaigns: (campaigns: Campaign[]) => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<CampaignFilters>) => void;
  clearCache: (baseId?: number) => void;
  hasCacheForBase: (baseId: number | null) => boolean;
  fetchCampaigns: (baseId: number | null) => Promise<void>;
  createCampaign: (campaign: Partial<Campaign>) => Promise<Campaign | null>;
  updateCampaign: (id: number, updates: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (id: number) => Promise<void>;
  refreshCampaign: (id: number) => Promise<void>;
  getFilteredCampaigns: () => Campaign[];
}

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  campaigns: [],
  loading: false,
  filters: {
    search: '',
    status: 'all',
    channel: 'all',
  },
  campaignCache: {},
  cacheTimeout: 2 * 60 * 1000, // 2 minutes

  setCampaigns: (campaigns) => set({ campaigns }),
  setLoading: (loading) => set({ loading }),

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),

  clearCache: (baseId) => {
    if (typeof baseId === 'number' && Number.isFinite(baseId)) {
      set((state) => {
        const next = { ...state.campaignCache };
        delete next[baseId];
        return { campaignCache: next };
      });
      return;
    }
    set({ campaignCache: {} });
  },

  hasCacheForBase: (baseId) => {
    if (!baseId) return false;
    return Boolean(get().campaignCache[baseId]);
  },

  fetchCampaigns: async (baseId) => {
    if (!baseId) {
      set({ campaigns: [], loading: false });
      return;
    }
    const state = get();
    const cached = state.campaignCache[baseId];
    const now = Date.now();

    // Instant paint from cache for same-base revisits.
    if (cached) {
      set({ campaigns: cached.campaigns, loading: false });
      if ((now - cached.timestamp) < state.cacheTimeout) {
        return;
      }
      // Stale-while-revalidate: keep UI responsive and refresh silently.
      void (async () => {
        try {
          const data = await apiRequest(`/campaigns?base_id=${baseId}`);
          const campaignsList = Array.isArray(data?.campaigns)
            ? data.campaigns
            : (Array.isArray(data) ? data : []);
          set((prev) => ({
            campaigns: campaignsList,
            campaignCache: {
              ...prev.campaignCache,
              [baseId]: {
                campaigns: campaignsList,
                timestamp: Date.now(),
              },
            },
          }));
        } catch (error) {
          console.error('Failed to refresh campaigns cache:', error);
        }
      })();
      return;
    }

    set({ loading: true });
    try {
      const data = await apiRequest(`/campaigns?base_id=${baseId}`);
      const campaignsList = Array.isArray(data?.campaigns)
        ? data.campaigns
        : (Array.isArray(data) ? data : []);
      set((prev) => ({
        campaigns: campaignsList,
        loading: false,
        campaignCache: {
          ...prev.campaignCache,
          [baseId]: {
            campaigns: campaignsList,
            timestamp: Date.now(),
          },
        },
      }));
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      set({ campaigns: [], loading: false });
    }
  },

  createCampaign: async (campaignData) => {
    try {
      const data = await apiRequest('/campaigns', {
        method: 'POST',
        body: JSON.stringify(campaignData),
      });
      const newCampaign = data?.campaign || data;
      set((state) => {
        const nextCampaigns = [...state.campaigns, newCampaign];
        const baseId = Number(newCampaign?.base_id ?? campaignData?.base_id);
        if (!Number.isFinite(baseId) || baseId <= 0) {
          return { campaigns: nextCampaigns };
        }
        const cached = state.campaignCache[baseId];
        const cachedCampaigns = cached ? [...cached.campaigns, newCampaign] : [newCampaign];
        return {
          campaigns: nextCampaigns,
          campaignCache: {
            ...state.campaignCache,
            [baseId]: {
              campaigns: cachedCampaigns,
              timestamp: Date.now(),
            },
          },
        };
      });
      return newCampaign;
    } catch (error) {
      console.error('Failed to create campaign:', error);
      return null;
    }
  },
  
  updateCampaign: async (id, updates) => {
    try {
      await apiRequest(`/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      set((state) => ({
        campaigns: state.campaigns.map(c =>
          c.id === id ? { ...c, ...updates } : c
        ),
        campaignCache: Object.fromEntries(
          Object.entries(state.campaignCache).map(([key, value]) => [
            key,
            {
              ...value,
              campaigns: value.campaigns.map(c => (c.id === id ? { ...c, ...updates } : c)),
              timestamp: Date.now(),
            },
          ])
        ) as Record<number, CampaignCacheEntry>,
      }));
    } catch (error) {
      console.error('Failed to update campaign:', error);
      throw error;
    }
  },
  
  deleteCampaign: async (id) => {
    try {
      await apiRequest(`/campaigns/${id}`, {
        method: 'DELETE',
      });
      set((state) => ({
        campaigns: state.campaigns.filter(c => c.id !== id),
        campaignCache: Object.fromEntries(
          Object.entries(state.campaignCache).map(([key, value]) => [
            key,
            {
              ...value,
              campaigns: value.campaigns.filter(c => c.id !== id),
              timestamp: Date.now(),
            },
          ])
        ) as Record<number, CampaignCacheEntry>,
      }));
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      throw error;
    }
  },
  
  refreshCampaign: async (id) => {
    try {
      // Fetch updated campaign data from API
      const data = await apiRequest(`/campaigns/${id}`);
      const updatedCampaign = data?.campaign || data;
      if (updatedCampaign) {
        // Update the campaign in the store
        set((state) => ({
          campaigns: state.campaigns.map(c =>
            c.id === id ? { ...c, ...updatedCampaign } : c
          ),
          campaignCache: Object.fromEntries(
            Object.entries(state.campaignCache).map(([key, value]) => [
              key,
              {
                ...value,
                campaigns: value.campaigns.map(c => (c.id === id ? { ...c, ...updatedCampaign } : c)),
                timestamp: Date.now(),
              },
            ])
          ) as Record<number, CampaignCacheEntry>,
        }));
        console.log(`[CampaignStore] Refreshed campaign ${id} metrics`);
      }
    } catch (error) {
      console.error(`Failed to refresh campaign ${id}:`, error);
      // Don't throw - just log the error so UI doesn't break
    }
  },
  
  getFilteredCampaigns: () => {
    const { campaigns, filters } = get();
    return campaigns.filter(campaign => {
      const matchesSearch = !filters.search || 
        campaign.name.toLowerCase().includes(filters.search.toLowerCase());
      const matchesStatus = filters.status === 'all' || campaign.status === filters.status;
      const matchesChannel = filters.channel === 'all' || campaign.channel === filters.channel;
      return matchesSearch && matchesStatus && matchesChannel;
    });
  },
}));

