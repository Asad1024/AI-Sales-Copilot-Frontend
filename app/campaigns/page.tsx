"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { useBaseStore } from "@/stores/useBaseStore";
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
    getFilteredCampaigns 
  } = useCampaignStore();

  // Fetch campaigns when base changes
  useEffect(() => {
    fetchCampaigns(activeBaseId);
  }, [activeBaseId, fetchCampaigns]);

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
