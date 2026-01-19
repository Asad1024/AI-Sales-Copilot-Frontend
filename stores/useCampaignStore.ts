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

interface CampaignStore {
  campaigns: Campaign[];
  loading: boolean;
  filters: CampaignFilters;
  setCampaigns: (campaigns: Campaign[]) => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<CampaignFilters>) => void;
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
  
  setCampaigns: (campaigns) => set({ campaigns }),
  setLoading: (loading) => set({ loading }),
  
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),
  
  fetchCampaigns: async (baseId) => {
    set({ loading: true });
    try {
      const params = baseId ? `?base_id=${baseId}` : '';
      const data = await apiRequest(`/campaigns${params}`);
      const campaignsList = Array.isArray(data?.campaigns) 
        ? data.campaigns 
        : (Array.isArray(data) ? data : []);
      set({ campaigns: campaignsList, loading: false });
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
      set((state) => ({
        campaigns: [...state.campaigns, newCampaign]
      }));
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
        )
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
        campaigns: state.campaigns.filter(c => c.id !== id)
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
          )
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

