"use client";
import { useState } from "react";
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
  /** False when the workspace has no leads yet — hide "Create campaign" until leads exist */
  allowCreateCampaign?: boolean;
}

export function CampaignGrid({ campaigns, onDelete, allowCreateCampaign = true }: CampaignGridProps) {
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
          icon={<Icons.Send size={18} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />}
          title="No campaigns yet"
          description={
            allowCreateCampaign
              ? "Create a campaign to reach leads across email, LinkedIn, WhatsApp, or calls."
              : "Add leads to this workspace first — then you can create a campaign and reach them across email, LinkedIn, WhatsApp, or calls."
          }
          actions={
            allowCreateCampaign ? (
              <button
                type="button"
                onClick={() => goToNewCampaignOrWorkspaces(router, activeBaseId)}
                className="btn-dashboard-outline focus-ring"
              >
                <Icons.Plus size={16} strokeWidth={1.5} />
                Create Campaign
              </button>
            ) : activeBaseId ? (
              <button
                type="button"
                className="btn-dashboard-outline focus-ring"
                onClick={() => router.push(`/bases/${activeBaseId}/leads?welcome=1`)}
              >
                <Icons.Users size={16} strokeWidth={1.5} />
                Add leads
              </button>
            ) : null
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
