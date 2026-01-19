"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { useSocket } from "@/hooks/useSocket";
import { CampaignHeader } from "./components/CampaignHeader";
import { CampaignStats } from "./components/CampaignStats";
import { CampaignGrid } from "./components/CampaignGrid";
import { TierBreakdown } from "./components/TierBreakdown";

export default function CampaignsPage() {
  const router = useRouter();
  const { activeBaseId } = useBaseStore();
  const { 
    campaigns, 
    loading, 
    fetchCampaigns, 
    getFilteredCampaigns,
    refreshCampaign 
  } = useCampaignStore();
  
  const socket = useSocket();

  // Fetch campaigns when base changes
  useEffect(() => {
    fetchCampaigns(activeBaseId);
  }, [activeBaseId, fetchCampaigns]);

  // Listen for real-time campaign metrics updates via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleCampaignMetricsUpdate = (data: {
      campaign_id: number;
      event_type: string;
      lead_id?: number;
      timestamp: string;
    }) => {
      console.log('[WebSocket] Campaign metrics updated:', data);
      // Refresh the specific campaign to get updated metrics
      refreshCampaign(data.campaign_id);
    };

    socket.on('campaign:metrics:update', handleCampaignMetricsUpdate);

    return () => {
      socket.off('campaign:metrics:update', handleCampaignMetricsUpdate);
    };
  }, [socket, refreshCampaign]);

  const filteredCampaigns = getFilteredCampaigns();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <CampaignHeader />
      <CampaignStats />
      <TierBreakdown />
      <CampaignGrid 
        campaigns={filteredCampaigns}
        loading={loading}
      />
    </div>
  );
}
