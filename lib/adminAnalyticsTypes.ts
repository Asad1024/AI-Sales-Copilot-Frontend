export type AdminGrowthPoint = {
  date: string;
  users: number;
  leads: number;
  campaigns: number;
  cumulativeLeads: number;
};

export type AdminStatusSlice = { status: string; count: number };
export type AdminTierSlice = { tier: string; count: number };
export type AdminWorkspaceLeadRow = { id: number; name: string; leadCount: number };

export type AdminAnalyticsPayload = {
  days: number;
  generatedAt: string;
  totals: { users: number; leads: number; campaigns: number; bases: number };
  growthTimeseries: AdminGrowthPoint[];
  campaignStatusBreakdown: AdminStatusSlice[];
  leadsByTier: AdminTierSlice[];
  topWorkspacesByLeads: AdminWorkspaceLeadRow[];
};
