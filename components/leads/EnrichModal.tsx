"use client";

import { useMemo, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useBaseStore } from "@/stores/useBaseStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useNotification } from "@/context/NotificationContext";
import { Icons } from "@/components/ui/Icons";

interface EnrichModalProps {
  open: boolean;
  onClose: () => void;
  onEnriched?: () => void;
  /** Lead IDs currently being enriched (contact flow); those are skipped. */
  pendingLeadIds?: number[];
  onAsyncEnrichmentStarted?: (payload: {
    leadIds: number[];
    enrichmentIds: string[];
    pendingCount: number;
  }) => void;
}

export function EnrichModal({
  open,
  onClose,
  onEnriched,
  pendingLeadIds = [],
  onAsyncEnrichmentStarted,
}: EnrichModalProps) {
  const { activeBaseId } = useBaseStore();
  const { selectedLeads, leads } = useLeadStore();
  const { showSuccess, showError } = useNotification();

  const [enrichmentType, setEnrichmentType] = useState<"contact" | "deep_research">("deep_research");
  const [purpose, setPurpose] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState("");
  const [enrichScope, setEnrichScope] = useState<"selected" | "all">("selected");

  const pendingSet = useMemo(() => new Set(pendingLeadIds), [pendingLeadIds]);

  const { leadsToRequest, skippedPending, rawTotal } = useMemo(() => {
    const raw =
      enrichScope === "selected" ? [...selectedLeads] : leads.map(l => l.id);
    const skipped = raw.filter(id => pendingSet.has(id));
    const allowed = raw.filter(id => !pendingSet.has(id));
    return {
      leadsToRequest: allowed,
      skippedPending: skipped.length,
      rawTotal: raw.length,
    };
  }, [enrichScope, selectedLeads, leads, pendingSet]);

  if (!open) return null;

  const canSubmit =
    leadsToRequest.length > 0 &&
    !(enrichScope === "selected" && selectedLeads.length === 0);

  const handleEnrich = async () => {
    if (!activeBaseId) {
      showError("Something went wrong", "Choose a workspace and try again.");
      return;
    }

    if (enrichScope === "selected" && selectedLeads.length === 0) {
      showError("No leads selected", "Select one or more rows, or choose “All leads”.");
      return;
    }

    if (leadsToRequest.length === 0) {
      showError(
        "Still updating",
        "Every lead you chose is already being enriched. Wait until they finish before trying again."
      );
      return;
    }

    setEnriching(true);
    setProgress(
      enrichmentType === "contact"
        ? `Finding contact details for ${leadsToRequest.length} lead(s)…`
        : `Enriching ${leadsToRequest.length} lead(s)…`
    );

    try {
      const response = await apiRequest("/leads/bulk-enrich", {
        method: "POST",
        body: JSON.stringify({
          lead_ids: leadsToRequest,
          base_id: activeBaseId,
          enrichment_type: enrichmentType,
          only_fullenrich: enrichmentType === "contact",
        }),
      });

      if (enrichmentType === "contact") {
        const enrichmentIds = Array.isArray(response?.enrichment_ids)
          ? response.enrichment_ids.filter((id: unknown) => typeof id === "string" && id.trim().length > 0)
          : [];
        const pendingCount =
          typeof response?.pending_count === "number"
            ? response.pending_count
            : leadsToRequest.length;

        onAsyncEnrichmentStarted?.({
          leadIds: leadsToRequest,
          enrichmentIds,
          pendingCount,
        });

        setProgress("Request sent. Results will appear in your table when ready.");
        showSuccess(
          "Started",
          "We’re finding contact details for your leads. Your table will update automatically when results are ready."
        );

        setTimeout(() => {
          setEnriching(false);
          setProgress("");
          setPurpose("");
          onClose();
        }, 1800);
      } else if (response?.enriched && response.enriched.length > 0) {
        setProgress(`Done — updated ${response.enriched.length} lead(s).`);
        showSuccess("Enrichment complete", `Updated ${response.enriched.length} lead(s).`);

        setTimeout(() => {
          setEnriching(false);
          setProgress("");
          setPurpose("");
          onEnriched?.();
          onClose();
        }, 1400);
      } else {
        throw new Error("No leads were enriched");
      }
    } catch (error: unknown) {
      console.error("Enrichment error:", error);
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      showError("Couldn’t enrich", message);
      setProgress("");
      setEnriching(false);
    }
  };

  const chipActive = (on: boolean) =>
    ({
      flex: 1,
      padding: "11px 14px",
      borderRadius: 10,
      border: on ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
      background: on ? "rgba(124, 58, 237, 0.1)" : "var(--color-surface-secondary)",
      color: "var(--color-text)",
      fontSize: 13,
      fontWeight: 500,
      cursor: "pointer",
      transition: "border-color 0.15s ease, background 0.15s ease",
    }) as const;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes enrichModalIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes enrichPanelIn { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes enrichSpin { to { transform: rotate(360deg); } }
      `,
        }}
      />

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          background: "rgba(0, 0, 0, 0.55)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          animation: "enrichModalIn 0.2s ease-out",
        }}
        onClick={onClose}
        role="presentation"
      >
        <div
          style={{
            width: "min(520px, 96vw)",
            maxHeight: "90vh",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 16,
            boxShadow: "0 24px 64px var(--color-shadow)",
            animation: "enrichPanelIn 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="enrich-modal-title"
        >
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-surface-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(124, 58, 237, 0.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icons.Sparkles size={20} strokeWidth={1.5} style={{ color: "var(--color-primary)" }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2
                  id="enrich-modal-title"
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--color-text)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Enrich leads
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                  Add or refresh contact and research data
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 36,
                height: 36,
                padding: 0,
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icons.X size={18} strokeWidth={1.5} />
            </button>
          </div>

          <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
            {enriching ? (
              <div style={{ textAlign: "center", padding: "36px 16px 28px" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    margin: "0 auto 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icons.Loader
                    size={40}
                    strokeWidth={1.5}
                    style={{ color: "var(--color-primary)", animation: "enrichSpin 0.85s linear infinite" }}
                  />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", marginBottom: 8 }}>
                  {progress || "Working on your leads…"}
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5, maxWidth: 320, margin: "0 auto" }}>
                  {enrichmentType === "contact"
                    ? "You can keep working elsewhere. Your table will refresh when new details arrive."
                    : "This may take a little while for larger lists."}
                </div>
              </div>
            ) : (
              <>
                {skippedPending > 0 && (
                  <div
                    style={{
                      marginBottom: 16,
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface-secondary)",
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                      lineHeight: 1.45,
                    }}
                  >
                    <strong style={{ color: "var(--color-text)" }}>{skippedPending} lead(s) still updating</strong>
                    — they’re not included in this run. Wait until the “Processing” label clears on those rows.
                  </div>
                )}

                <div style={{ marginBottom: 18 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: 10,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Who to enrich
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setEnrichScope("selected")}
                      disabled={selectedLeads.length === 0}
                      style={{
                        ...chipActive(enrichScope === "selected"),
                        opacity: selectedLeads.length === 0 ? 0.5 : 1,
                        cursor: selectedLeads.length === 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      Selected ({selectedLeads.length})
                    </button>
                    <button type="button" onClick={() => setEnrichScope("all")} style={chipActive(enrichScope === "all")}>
                      All ({leads.length})
                    </button>
                  </div>
                  {rawTotal > 0 && leadsToRequest.length < rawTotal && (
                    <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
                      This run will update <strong>{leadsToRequest.length}</strong> of {rawTotal} lead(s).
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: 10,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Type
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" onClick={() => setEnrichmentType("contact")} style={chipActive(enrichmentType === "contact")}>
                      Contact only
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnrichmentType("deep_research")}
                      style={chipActive(enrichmentType === "deep_research")}
                    >
                      Deep research
                    </button>
                  </div>
                  <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                    {enrichmentType === "contact"
                      ? "Looks up email and phone when possible. New details appear in the table when we receive them."
                      : "Adds company and person context for smarter outreach."}
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Context (optional)
                  </label>
                  <textarea
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    placeholder="e.g. Focus on B2B SaaS buyers in healthcare"
                    style={{
                      width: "100%",
                      minHeight: 76,
                      padding: "11px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface-secondary)",
                      color: "var(--color-text)",
                      fontSize: 13,
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-ghost"
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1px solid var(--color-border)",
                      fontWeight: 500,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleEnrich}
                    disabled={enriching || !canSubmit}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: 10,
                      fontWeight: 600,
                      background: "var(--color-primary)",
                      border: "none",
                      opacity: !canSubmit ? 0.45 : 1,
                      cursor: !canSubmit ? "not-allowed" : "pointer",
                      boxShadow: !canSubmit ? "none" : "0 8px 22px rgba(124, 58, 237, 0.28)",
                    }}
                  >
                    {enriching
                      ? "Please wait…"
                      : `Enrich ${leadsToRequest.length || 0} lead(s)`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
