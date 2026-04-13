"use client";
import { useState, useEffect, useMemo } from "react";
import { Icons } from "@/components/ui/Icons";
import { useBaseStore } from "@/stores/useBaseStore";
import { apiRequest } from "@/lib/apiClient";
import { getEmailInfo, getEmailDisplayText } from "@/utils/emailNormalization";
import { TierCampaignModal } from "./TierCampaignModal";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";

const HOT = "#e11d48";
const WARM = "#ea580c";
const COLD = "var(--color-text-muted)";

type TierKey = "Hot" | "Warm" | "Cold";

const disclosureChevronTransition = "transform 0.42s cubic-bezier(0.33, 1, 0.68, 1)";

export type TierBreakdownProps = {
  /**
   * When set (including `[]`), tier math uses this list and the component does not fetch `/leads`.
   * Omit to keep legacy self-fetch (e.g. if reused elsewhere).
   */
  leadsForTiers?: any[];
};

export function TierBreakdown({ leadsForTiers }: TierBreakdownProps) {
  const { activeBaseId } = useBaseStore();
  const externallySupplied = leadsForTiers !== undefined;
  const [internalLeads, setInternalLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [showTierBreakdown, setShowTierBreakdown] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierKey | null>(null);
  const [showTierModal, setShowTierModal] = useState(false);

  useEffect(() => {
    if (externallySupplied) {
      setLoadingLeads(false);
      return;
    }
    const fetchLeads = async () => {
      if (!activeBaseId) {
        setInternalLeads([]);
        setLoadingLeads(false);
        return;
      }
      setLoadingLeads(true);
      try {
        const data = await apiRequest(`/leads?base_id=${activeBaseId}&page=1&limit=100`);
        const leadsList = Array.isArray(data?.leads) ? data.leads : (Array.isArray(data) ? data : []);
        setInternalLeads(leadsList);
      } catch (error) {
        console.error("Failed to fetch leads:", error);
        setInternalLeads([]);
      } finally {
        setLoadingLeads(false);
      }
    };
    fetchLeads();
  }, [activeBaseId, externallySupplied]);

  const leads = externallySupplied ? leadsForTiers : internalLeads;

  const tierBreakdown = useMemo(() => {
    const hot = leads.filter((l) => l.tier === "Hot");
    const warm = leads.filter((l) => l.tier === "Warm");
    const cold = leads.filter((l) => l.tier === "Cold" || !l.tier);
    const total = leads.length;

    return {
      hot,
      warm,
      cold,
      total,
      hotCount: hot.length,
      warmCount: warm.length,
      coldCount: cold.length,
      hotPercent: total > 0 ? (hot.length / total) * 100 : 0,
      warmPercent: total > 0 ? (warm.length / total) * 100 : 0,
      coldPercent: total > 0 ? (cold.length / total) * 100 : 0,
    };
  }, [leads]);

  const openTier = (tier: TierKey) => {
    const newTier = selectedTier === tier ? null : tier;
    setSelectedTier(newTier);
    if (newTier) setShowTierModal(true);
  };

  if (!activeBaseId) return null;

  const cardShell = {
    borderRadius: 12,
    background: "var(--elev-bg, var(--color-surface))",
    border: "1px solid var(--elev-border, var(--color-border))",
    boxShadow: "var(--elev-shadow)",
    overflow: "hidden" as const,
  };

  if (!externallySupplied && loadingLeads) {
    return (
      <div style={cardShell} aria-busy="true" aria-label="Loading engagement insights">
        <GlobalPageLoader layout="embedded" minHeight={140} ariaLabel="Loading engagement insights" />
      </div>
    );
  }

  const tierPills: Array<{
    key: TierKey;
    label: string;
    count: number;
    pct: string;
    color: string;
    bg: string;
    border: string;
    icon: typeof Icons.Flame;
  }> = [
    {
      key: "Hot",
      label: "Hot",
      count: tierBreakdown.hotCount,
      pct: tierBreakdown.total ? ((tierBreakdown.hotCount / tierBreakdown.total) * 100).toFixed(0) : "0",
      color: HOT,
      bg: "rgba(225, 29, 72, 0.08)",
      border: "rgba(225, 29, 72, 0.22)",
      icon: Icons.Flame,
    },
    {
      key: "Warm",
      label: "Warm",
      count: tierBreakdown.warmCount,
      pct: tierBreakdown.total ? ((tierBreakdown.warmCount / tierBreakdown.total) * 100).toFixed(0) : "0",
      color: WARM,
      bg: "rgba(234, 88, 12, 0.08)",
      border: "rgba(234, 88, 12, 0.22)",
      icon: Icons.Thermometer,
    },
    {
      key: "Cold",
      label: "Cold",
      count: tierBreakdown.coldCount,
      pct: tierBreakdown.total ? ((tierBreakdown.coldCount / tierBreakdown.total) * 100).toFixed(0) : "0",
      color: COLD,
      bg: "var(--color-surface-secondary)",
      border: "var(--elev-border, var(--color-border))",
      icon: Icons.Snowflake,
    },
  ];

  return (
    <div style={cardShell}>
      <button
        type="button"
        id="engagement-insights-trigger"
        aria-expanded={insightsExpanded}
        aria-controls="engagement-insights-panel"
        onClick={() => setInsightsExpanded((v) => !v)}
        className="focus-ring campaigns-engagement-disclosure__trigger"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "10px 14px",
          margin: 0,
          border: "none",
          borderBottom: insightsExpanded ? "1px solid var(--elev-border, var(--color-border-light))" : "none",
          borderRadius: 0,
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.2s ease, border-color 0.2s ease",
        }}
      >
        <Icons.ChevronDown
          size={18}
          strokeWidth={2}
          aria-hidden
          className="campaigns-engagement-disclosure__chevron"
          style={{
            color: "var(--color-text-muted)",
            flexShrink: 0,
            transform: insightsExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: disclosureChevronTransition,
          }}
        />
        <span className="campaigns-engagement-disclosure__trigger-label" style={{ fontSize: 13.5, lineHeight: 1.35 }}>
          View Engagement Insights
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-text-muted)",
            flexShrink: 0,
            paddingLeft: 8,
          }}
        >
          Total Leads: {tierBreakdown.total.toLocaleString()}
        </span>
      </button>

      <div
        id="engagement-insights-panel"
        role="region"
        aria-labelledby="engagement-insights-trigger"
        className={`campaigns-engagement-disclosure__panel${insightsExpanded ? " campaigns-engagement-disclosure__panel--open" : ""}`}
      >
        <div className="campaigns-engagement-disclosure__panel-inner" aria-hidden={!insightsExpanded}>
          <div style={{ padding: "12px 14px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 180px" }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                    marginBottom: 4,
                  }}
                >
                  Engagement tiers
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
                  {tierBreakdown.total.toLocaleString()} leads in workspace
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2, lineHeight: 1.4 }}>
                  Based on replies and LinkedIn acceptance. Click a tier to target a campaign.
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTierBreakdown(!showTierBreakdown);
                }}
                className="btn-ghost"
                style={{
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  flexShrink: 0,
                  border: "1px solid var(--elev-border, var(--color-border))",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {showTierBreakdown ? (
                  <>
                    <Icons.ChevronUp size={14} strokeWidth={1.5} />
                    Hide list
                  </>
                ) : (
                  <>
                    <Icons.ChevronDown size={14} strokeWidth={1.5} />
                    Preview hot leads
                  </>
                )}
              </button>
            </div>

            {/* Thin pill tabs — dot + label + count */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
                paddingTop: 12,
                marginTop: 2,
                borderTop: "1px solid var(--elev-border, var(--color-border-light))",
              }}
            >
        {tierPills.map((t) => {
          const Icon = t.icon;
          const isSel = selectedTier === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => openTier(t.key)}
              title={`${t.label}: ${t.count} leads (${t.pct}%)`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 9999,
                border: isSel ? `1px solid ${t.color}` : "1px solid var(--elev-border, #e2e8f0)",
                background: isSel ? t.bg : "transparent",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                transition: "border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
                boxShadow: isSel ? `0 0 0 1px ${t.color}22` : "none",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={12} strokeWidth={2} style={{ color: t.color }} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)", letterSpacing: "-0.01em" }}>
                {t.label}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", marginLeft: 2 }}>
                {t.count}
                <span style={{ opacity: 0.75, fontWeight: 500 }}> · {t.pct}%</span>
              </span>
            </button>
          );
        })}
            </div>

            {showTierBreakdown && tierBreakdown.hot.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--elev-border, var(--color-border-light))" }}>
          <h4
            style={{
              fontSize: 12,
              fontWeight: 600,
              margin: "0 0 8px 0",
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icons.Flame size={14} strokeWidth={1.5} style={{ color: HOT }} />
            Hot preview (top {Math.min(50, tierBreakdown.hot.length)})
          </h4>
          <div
            style={{
              maxHeight: 180,
              overflowY: "auto",
              border: "1px solid var(--elev-border, var(--color-border))",
              borderRadius: 8,
              background: "var(--color-surface-secondary)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--color-surface-secondary)", zIndex: 1 }}>
                <tr>
                  {(["Name", "Email", "Company", "Score"] as const).map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        borderBottom: "1px solid var(--elev-border, var(--color-border))",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--color-text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tierBreakdown.hot.slice(0, 50).map((lead, idx) => {
                  const emailInfo = getEmailInfo(lead.email, lead.enrichment);
                  const emailDisplay = getEmailDisplayText(emailInfo);
                  return (
                    <tr
                      key={lead.id}
                      style={{
                        background: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.03)",
                      }}
                    >
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--elev-border, var(--color-border-light))", color: "var(--color-text)" }}>
                        {lead.first_name || lead.last_name ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim() : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          borderBottom: "1px solid var(--elev-border, var(--color-border-light))",
                          fontStyle: !emailInfo.isValid ? "italic" : "normal",
                          color: "var(--color-text)",
                        }}
                      >
                        {emailDisplay}
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--elev-border, var(--color-border-light))", color: "var(--color-text-muted)" }}>
                        {lead.company || "—"}
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--elev-border, var(--color-border-light))" }}>
                        <span
                          style={{
                            background: "rgba(225, 29, 72, 0.12)",
                            color: HOT,
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {lead.score ?? 0}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
            )}
          </div>
        </div>
      </div>

      {showTierModal && selectedTier && (
        <TierCampaignModal
          tier={selectedTier}
          onClose={() => {
            setShowTierModal(false);
            setSelectedTier(null);
          }}
        />
      )}
    </div>
  );
}
