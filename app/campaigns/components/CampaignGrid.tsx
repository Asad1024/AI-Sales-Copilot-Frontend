"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import EmptyStateBanner from "@/components/ui/EmptyStateBanner";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import { useCampaignStore, Campaign } from "@/stores/useCampaignStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { goToNewCampaignOrWorkspaces } from "@/lib/goToNewCampaign";
import CampaignCard from "./CampaignCard";
interface CampaignGridProps {
  campaigns: Campaign[];
  onDelete?: (id: number) => void;
}

export function CampaignGrid({ campaigns, onDelete }: CampaignGridProps) {
  const router = useRouter();
  const { showError, showSuccess } = useNotification();
  const confirm = useConfirm();
  const { bases, activeBaseId } = useBaseStore();
  const { deleteCampaign } = useCampaignStore();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDeleteClick = async (id: number) => {
    const ok = await confirm({
      title: "Delete campaign",
      message: "This cannot be undone. All campaign data tied to this run will be removed.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await deleteCampaign(id);
      if (onDelete) onDelete(id);
      showSuccess("Campaign deleted", "The campaign was removed.");
    } catch {
      showError("Delete failed", "Failed to delete campaign.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {campaigns.length === 0 && (
        <EmptyStateBanner
          icon={<Icons.Rocket size={18} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />}
          title="No campaigns yet"
          description="Create a campaign to reach leads across email, LinkedIn, WhatsApp, or calls."
          actions={
            <>
              <button
                type="button"
                onClick={() => goToNewCampaignOrWorkspaces(router, activeBaseId)}
                className="btn-dashboard-outline focus-ring"
              >
                <Icons.Plus size={16} strokeWidth={1.5} />
                Create Campaign
              </button>
              <Link
                href="/flow/new-goal"
                className="btn-ghost ms-hover-scale ms-press focus-ring"
                style={{ borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <Icons.Sparkles size={16} strokeWidth={1.5} />
                AI flow
              </Link>
            </>
          }
        />
      )}

      {campaigns.length > 0 && (
        <div className="campaigns-page-grid">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              baseName={bases.find((b) => b.id === campaign.base_id)?.name || "Workspace"}
              onView={() => router.push(`/campaigns/${campaign.id}`)}
              onDelete={() => handleDeleteClick(campaign.id)}
              deleting={deletingId === campaign.id}
              workspaceStyle
            />
          ))}
        </div>
      )}

    </div>
  );
}
