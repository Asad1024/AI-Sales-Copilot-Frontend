"use client";

import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { useBaseStore } from "@/stores/useBaseStore";
import { goToNewCampaignOrWorkspaces } from "@/lib/goToNewCampaign";

type LeadsEmptyWorkspaceBannerProps = {
  workspaceName: string;
  /** From `?welcome=1` after creating a workspace — stronger headline + dismiss clears query */
  showWelcomeHint: boolean;
  onDismissWelcome: () => void;
  canCreateLeads: boolean;
  onGenerateAI: () => void;
  onImportCSV: () => void;
};

export function LeadsEmptyWorkspaceBanner({
  workspaceName,
  showWelcomeHint,
  onDismissWelcome,
  canCreateLeads,
  onGenerateAI,
  onImportCSV,
}: LeadsEmptyWorkspaceBannerProps) {
  const router = useRouter();
  const { activeBaseId } = useBaseStore();

  return (
    <div
      className={`leads-zero-top-banner${showWelcomeHint ? " leads-zero-top-banner--welcome" : ""}`}
      role="region"
      aria-label="Getting started on Leads"
    >
      {showWelcomeHint && (
        <button
          type="button"
          className="leads-zero-top-banner-dismiss"
          onClick={onDismissWelcome}
          aria-label="Dismiss welcome message"
        >
          <Icons.X size={18} strokeWidth={1.5} />
        </button>
      )}
      <Icons.Users size={22} strokeWidth={1.5} className="leads-zero-top-banner-icon" />
      <div className="leads-zero-top-banner-content">
        <h2 className="leads-zero-top-banner-title">
          {showWelcomeHint ? "Welcome — your workspace is ready" : "Add your first leads"}
        </h2>
        <p className="leads-zero-top-banner-body">
          You’re on the <strong>Leads</strong> page for <strong>{workspaceName || "this workspace"}</strong>. Add or
          import contacts here — you’ll use them when you build <strong>campaigns</strong> and run enrichment.
        </p>
        {canCreateLeads ? (
          <div className="leads-zero-top-banner-actions">
            <button type="button" className="bases-workspace-next-cta-primary" onClick={onGenerateAI}>
              Generate with AI
            </button>
            <button type="button" className="dashboard-demo-toggle-badge" onClick={onImportCSV}>
              Import CSV
            </button>
            <button
              type="button"
              className="leads-zero-top-banner-campaign-link"
              onClick={() => goToNewCampaignOrWorkspaces(router, activeBaseId)}
            >
              Create campaign (after you add leads)
            </button>
          </div>
        ) : (
          <p className="leads-zero-top-banner-viewonly">You have view-only access. Ask a workspace admin to add leads.</p>
        )}
      </div>
    </div>
  );
}
