"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useBaseStore } from "@/stores/useBaseStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useNotification } from "@/context/NotificationContext";
import { Icons } from "@/components/ui/Icons";
import { ImportModalFrame } from "@/components/leads/ImportModalChrome";

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

  const [enrichmentType, setEnrichmentType] = useState<"contact" | "deep_research">("contact");
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState("");
  const [enrichScope, setEnrichScope] = useState<"selected" | "all">("selected");

  useEffect(() => {
    if (!open) return;
    setEnrichmentType("contact");
    setAdditionalOpen(false);
  }, [open]);

  useEffect(() => {
    if (enrichmentType === "deep_research") setAdditionalOpen(true);
  }, [enrichmentType]);

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
          onClose();
        }, 1800);
      } else if (response?.enriched && response.enriched.length > 0) {
        setProgress(`Done — updated ${response.enriched.length} lead(s).`);
        showSuccess("Enrichment complete", `Updated ${response.enriched.length} lead(s).`);

        setTimeout(() => {
          setEnriching(false);
          setProgress("");
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

  const typePrimary = (on: boolean) =>
    ({
      width: "100%",
      padding: "14px 16px",
      borderRadius: 12,
      border: on ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
      background: on ? "rgba(37, 99, 235, 0.08)" : "var(--color-surface-secondary)",
      color: "var(--color-text)",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      textAlign: "left" as const,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      transition: "border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
      boxShadow: on ? "0 1px 0 rgba(255,255,255,0.05) inset" : "none",
    }) as const;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes enrichSpin { to { transform: rotate(360deg); } }
        .enrich-additional-panel {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .enrich-additional-panel.is-open {
          grid-template-rows: 1fr;
        }
        .enrich-additional-inner {
          overflow: hidden;
          min-height: 0;
        }
      `,
        }}
      />

      <ImportModalFrame
        open={open}
        onClose={onClose}
        title="Enrich leads"
        subtitle="Add or refresh contact and research data"
        headerTint="var(--color-primary, #2563eb)"
        icon={<Icons.Sparkles size={22} strokeWidth={2} style={{ color: "#ffffff" }} />}
        headerTitleColor="#ffffff"
        headerSubtitleColor="rgba(255,255,255,0.86)"
        headerBorderColor="rgba(255,255,255,0.24)"
        hideHeaderBottomBorder
        headerIconContainerStyle={{
          background: "rgba(255,255,255,0.2)",
          border: "1px solid rgba(255,255,255,0.45)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 14px rgba(0, 0, 0, 0.12)",
          borderRadius: 12,
          width: 44,
          height: 44,
        }}
        headerCloseButtonStyle={{
          background: "rgba(255,255,255,0.2)",
          border: "1px solid rgba(255,255,255,0.38)",
          color: "#f8fafc",
          width: 40,
          height: 40,
          borderRadius: 12,
        }}
        frameBorderRadius={12}
        maxWidth={520}
        maxModalHeight="min(90vh, 720px)"
        closeDisabled={enriching}
        dialogBackground="var(--color-surface)"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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

                <div style={{ marginBottom: 22 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: 8,
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
                      className={`ai-generate-suggestion-pill${enrichScope === "selected" ? " ai-generate-suggestion-pill--active" : ""}`}
                      style={{
                        flex: 1,
                        opacity: selectedLeads.length === 0 ? 0.5 : 1,
                        cursor: selectedLeads.length === 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      Selected ({selectedLeads.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnrichScope("all")}
                      className={`ai-generate-suggestion-pill${enrichScope === "all" ? " ai-generate-suggestion-pill--active" : ""}`}
                      style={{ flex: 1 }}
                    >
                      All ({leads.length})
                    </button>
                  </div>
                  {rawTotal > 0 && leadsToRequest.length < rawTotal && (
                    <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.45 }}>
                      This run will update <strong style={{ color: "var(--color-text)" }}>{leadsToRequest.length}</strong> of{" "}
                      {rawTotal} lead(s).
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Type
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEnrichmentType("contact");
                      setAdditionalOpen(false);
                    }}
                    style={typePrimary(enrichmentType === "contact")}
                  >
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, minWidth: 0 }}>
                      <span>Contact only</span>
                      <span style={{ fontSize: 12, fontWeight: 400, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                        Email, phone, and profile fields when available
                      </span>
                    </span>
                    {enrichmentType === "contact" ? (
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "var(--color-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icons.Check size={14} strokeWidth={2.5} style={{ color: "#fff" }} />
                      </span>
                    ) : (
                      <span style={{ width: 22, height: 22, flexShrink: 0 }} aria-hidden />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdditionalOpen(o => !o)}
                    aria-expanded={additionalOpen}
                    style={{
                      width: "100%",
                      marginTop: 10,
                      padding: "11px 14px",
                      borderRadius: 12,
                      border: "1px dashed var(--color-border)",
                      background: additionalOpen ? "var(--color-surface-secondary)" : "transparent",
                      color: "var(--color-text)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      transition: "background 0.2s ease, border-color 0.2s ease",
                    }}
                  >
                    <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>Additional</span>
                    <Icons.ChevronDown
                      size={18}
                      strokeWidth={2}
                      style={{
                        color: "var(--color-text-muted)",
                        transform: additionalOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
                        flexShrink: 0,
                      }}
                    />
                  </button>

                  <div className={`enrich-additional-panel ${additionalOpen ? "is-open" : ""}`}>
                    <div className="enrich-additional-inner">
                      <div style={{ paddingTop: 10 }}>
                        <button
                          type="button"
                          onClick={() => setEnrichmentType("deep_research")}
                          style={{
                            ...typePrimary(enrichmentType === "deep_research"),
                            marginTop: 0,
                          }}
                        >
                          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, minWidth: 0 }}>
                            <span>Deep research</span>
                            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--color-text-muted)", lineHeight: 1.45 }}>
                              Company and person context for smarter outreach — slower than contact-only
                            </span>
                          </span>
                          {enrichmentType === "deep_research" ? (
                            <span
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: "var(--color-primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Icons.Check size={14} strokeWidth={2.5} style={{ color: "#fff" }} />
                            </span>
                          ) : (
                            <span style={{ width: 22, height: 22, flexShrink: 0 }} aria-hidden />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 8,
                    paddingTop: 4,
                  }}
                >
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={enriching}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      borderRadius: 10,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      fontWeight: 600,
                      fontSize: 13,
                      color: "var(--color-text)",
                      cursor: enriching ? "not-allowed" : "pointer",
                      opacity: enriching ? 0.6 : 1,
                      transition: "background 0.15s ease, border-color 0.15s ease",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleEnrich}
                    disabled={enriching || !canSubmit}
                    className="btn-primary ai-generate-generate-btn"
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      opacity: !canSubmit ? 0.45 : 1,
                      cursor: !canSubmit || enriching ? "not-allowed" : "pointer",
                    }}
                  >
                    {enriching ? (
                      <>
                        <Icons.Loader size={16} strokeWidth={2} style={{ animation: "enrichSpin 0.85s linear infinite" }} />
                        Please wait…
                      </>
                    ) : (
                      <>
                        <Icons.Sparkles size={15} strokeWidth={2} aria-hidden />
                        Enrich {leadsToRequest.length || 0} lead{leadsToRequest.length === 1 ? "" : "s"}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
        </div>
      </ImportModalFrame>
    </>
  );
}
