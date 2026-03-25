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
import CampaignCard from "./CampaignCard";

interface CampaignGridProps {
  campaigns: Campaign[];
  loading: boolean;
  onDelete?: (id: number) => void;
}

function CampaignGridSkeleton() {
  const Card = () => (
    <div
      className="skeleton-page-card bases-workspace-card"
      style={{
        minHeight: 200,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxSizing: "border-box",
        pointerEvents: "none",
        cursor: "default",
      }}
      aria-hidden
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="ui-skeleton" style={{ height: 10, width: 88, borderRadius: 4 }} />
          <div className="ui-skeleton" style={{ height: 22, width: "72%", borderRadius: 8 }} />
          <div className="ui-skeleton" style={{ height: 10, width: "55%", borderRadius: 4 }} />
        </div>
        <div className="ui-skeleton" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "18px 20px",
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="ui-skeleton" style={{ height: 10, width: "58%", borderRadius: 4 }} />
            <div className="ui-skeleton" style={{ height: 16, width: "42%", borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="campaigns-page-grid" aria-busy="true" aria-label="Loading campaigns">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Card key={i} />
      ))}
    </div>
  );
}

export function CampaignGrid({ campaigns, loading, onDelete }: CampaignGridProps) {
  const router = useRouter();
  const { showError, showSuccess } = useNotification();
  const confirm = useConfirm();
  const { bases } = useBaseStore();
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
      {loading && <CampaignGridSkeleton />}

      {!loading && campaigns.length === 0 && (
        <EmptyStateBanner
          icon={<Icons.Rocket size={18} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />}
          title="No campaigns yet"
          description="Create a campaign to reach leads across email, LinkedIn, WhatsApp, or calls."
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/campaigns/new")}
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

      {!loading && campaigns.length > 0 && (
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
