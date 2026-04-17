"use client";

import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import {
  AirtableBrandIcon,
  GenerateLeadAIIcon,
  GoogleSheetsBrandIcon,
  MicrosoftExcelBrandIcon,
} from "@/app/leads/components/LeadSourceBrandIcons";

type LeadsEmptyWorkspaceBannerProps = {
  workspaceName: string;
  /** From `?welcome=1` after creating a workspace — stronger copy + dismiss clears query */
  showWelcomeHint: boolean;
  onDismissWelcome: () => void;
  canCreateLeads: boolean;
  onGenerateAI: () => void;
  onImportCSV: () => void;
  /** Settings → Connectors Google Sheets vault configured */
  onImportSheets?: () => void;
  /** Airtable integration connected */
  onImportAirtable?: () => void;
};

/**
 * Empty-state banner for workspace leads: clear hierarchy, primary “Generate” CTA, compact import options.
 */
export function LeadsEmptyWorkspaceBanner({
  workspaceName,
  showWelcomeHint,
  onDismissWelcome,
  canCreateLeads,
  onGenerateAI,
  onImportCSV,
  onImportSheets,
  onImportAirtable,
}: LeadsEmptyWorkspaceBannerProps) {
  const router = useRouter();
  const name = workspaceName || "this workspace";

  return (
    <div
      className={`leads-empty-workspace-banner leads-empty-workspace-banner--sheet${
        showWelcomeHint ? " leads-empty-workspace-banner--welcome" : ""
      }`}
      role="region"
      aria-label="Getting started on Leads"
    >
      {showWelcomeHint ? (
        <div className="leads-empty-workspace-banner__topbar">
          <div className="leads-empty-workspace-banner__topbar-actions">
            {canCreateLeads ? (
              <button
                type="button"
                className="leads-empty-workspace-banner__dashboard"
                onClick={() => router.push("/dashboard")}
              >
                View dashboard
                <Icons.ChevronRight size={16} strokeWidth={2} aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              className="leads-empty-workspace-banner-dismiss"
              onClick={onDismissWelcome}
              aria-label="Dismiss welcome message"
            >
              <Icons.X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="leads-empty-workspace-banner__body">
        <div className="leads-empty-workspace-banner__icon" aria-hidden>
          <Icons.Users size={22} strokeWidth={1.5} />
        </div>

        <div className="leads-empty-workspace-banner__main">
          <div className="leads-empty-workspace-banner__head">
            <div className="leads-empty-workspace-banner__titles">
              <p className="leads-empty-workspace-banner__eyebrow">
                {showWelcomeHint ? "First steps" : "Leads"}
              </p>
              {showWelcomeHint ? (
                <h3 className="leads-empty-workspace-banner__title">
                  Welcome — <span className="leads-empty-workspace-banner__name">{name}</span> is ready
                </h3>
              ) : (
                <h3 className="leads-empty-workspace-banner__title">Add contacts to get started</h3>
              )}
              <p className="leads-empty-workspace-banner__lede">
                {showWelcomeHint ? (
                  <>
                    Choose a way to add people to <strong className="leads-empty-workspace-banner__name-inline">{name}</strong>.
                    You can use more than one method.
                  </>
                ) : (
                  <>
                    You&apos;re on <strong>Leads</strong> for{" "}
                    <strong className="leads-empty-workspace-banner__name-inline">{name}</strong>. Bring in contacts to run
                    campaigns and enrichment.
                  </>
                )}
              </p>
            </div>
            {!showWelcomeHint && canCreateLeads ? (
              <button
                type="button"
                className="leads-empty-workspace-banner__dashboard"
                onClick={() => router.push("/dashboard")}
              >
                View dashboard
                <Icons.ChevronRight size={16} strokeWidth={2} aria-hidden />
              </button>
            ) : null}
          </div>

        {canCreateLeads ? (
          <>
            <p className="leads-empty-workspace-banner__actions-label">Add contacts</p>
            <div className="leads-empty-workspace-banner-actions">
              <button
                type="button"
                className="leads-empty-hint-btn leads-empty-hint-btn--primary"
                onClick={onGenerateAI}
              >
                <GenerateLeadAIIcon size={20} sparklesSize={11} />
                Generate with AI
              </button>
              <button type="button" className="leads-empty-hint-btn leads-empty-hint-btn--secondary" onClick={onImportCSV}>
                <MicrosoftExcelBrandIcon size={17} />
                Import CSV
              </button>
              {onImportSheets ? (
                <button
                  type="button"
                  className="leads-empty-hint-btn leads-empty-hint-btn--secondary"
                  onClick={onImportSheets}
                >
                  <GoogleSheetsBrandIcon size={18} />
                  Import Sheets
                </button>
              ) : null}
              {onImportAirtable ? (
                <button
                  type="button"
                  className="leads-empty-hint-btn leads-empty-hint-btn--secondary"
                  onClick={onImportAirtable}
                >
                  <AirtableBrandIcon size={17} />
                  Import Airtable
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <p className="leads-empty-workspace-banner__lede leads-empty-workspace-banner__lede--solo">
            You have view-only access. Ask a workspace admin to add leads.
          </p>
        )}
        </div>
      </div>
    </div>
  );
}
