"use client";

import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";

type LeadsEmptyWorkspaceBannerProps = {
  workspaceName: string;
  /** From `?welcome=1` after creating a workspace — stronger copy + dismiss clears query */
  showWelcomeHint: boolean;
  onDismissWelcome: () => void;
  canCreateLeads: boolean;
  onGenerateAI: () => void;
  onImportCSV: () => void;
};

/**
 * Same visual pattern as Workspaces `bases-onboarding-hint` (flat lavender tint, icon, 13px body, purple links).
 */
export function LeadsEmptyWorkspaceBanner({
  workspaceName,
  showWelcomeHint,
  onDismissWelcome,
  canCreateLeads,
  onGenerateAI,
  onImportCSV,
}: LeadsEmptyWorkspaceBannerProps) {
  const router = useRouter();
  const name = workspaceName || "this workspace";

  return (
    <div
      className={`bases-onboarding-hint leads-empty-workspace-banner${
        showWelcomeHint ? " leads-empty-workspace-banner--welcome" : ""
      }`}
      role="region"
      aria-label="Getting started on Leads"
    >
      {showWelcomeHint && (
        <button
          type="button"
          className="leads-empty-workspace-banner-dismiss"
          onClick={onDismissWelcome}
          aria-label="Dismiss welcome message"
        >
          <Icons.X size={18} strokeWidth={1.5} />
        </button>
      )}

      <Icons.Users size={20} strokeWidth={1.5} className="bases-onboarding-hint-icon" />

      <div className="leads-empty-workspace-banner-text">
        {showWelcomeHint ? (
          <p className="bases-onboarding-hint-body">
            <strong>Welcome</strong> — <strong>{name}</strong> is ready. Use <strong>Generate with AI</strong> or{" "}
            <strong>Import CSV</strong> below to add contacts, then start a campaign when you&apos;re set. The dashboard
            checklist also tracks these steps.
          </p>
        ) : (
          <p className="bases-onboarding-hint-body">
            You&apos;re on <strong>Leads</strong> for <strong>{name}</strong>. Use <strong>Generate with AI</strong> or{" "}
            <strong>Import CSV</strong> to add contacts — you&apos;ll use them for campaigns and enrichment.
          </p>
        )}

        {canCreateLeads ? (
          <>
            <div className="leads-empty-workspace-banner-actions">
              <button type="button" className="leads-empty-hint-btn leads-empty-hint-btn--primary" onClick={onGenerateAI}>
                Generate with AI
              </button>
              <button type="button" className="leads-empty-hint-btn leads-empty-hint-btn--secondary" onClick={onImportCSV}>
                Import CSV
              </button>
            </div>
            <button type="button" className="bases-onboarding-hint-link" onClick={() => router.push("/dashboard")}>
              Go to dashboard
            </button>
          </>
        ) : (
          <p className="bases-onboarding-hint-body" style={{ marginTop: 8, marginBottom: 0 }}>
            You have view-only access. Ask a workspace admin to add leads.
          </p>
        )}
      </div>
    </div>
  );
}
