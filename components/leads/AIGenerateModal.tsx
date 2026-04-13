"use client";
import { useState, useEffect } from "react";
import { apiRequest, streamGenerateLeads } from "@/lib/apiClient";
import { useBase } from "@/context/BaseContext";
import EnrichmentLoader from "./EnrichmentLoader";
import { Icons } from "@/components/ui/Icons";
import { GenerateLeadAIIcon } from "@/app/leads/components/LeadSourceBrandIcons";
import { ImportModalFrame } from "@/components/leads/ImportModalChrome";

type Props = { open: boolean; onClose: () => void; onGenerated: (rows: any[]) => void };

const SUGGESTION_LOADING_PHASES = [
  "Mapping your segment…",
  "Choosing titles & seniority…",
  "Setting region & company size…",
  "Adding buying signals…",
  "Almost ready…",
];

export default function AIGenerateModal({ open, onClose, onGenerated }: Props) {
  const { activeBaseId } = useBase();
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  /** Real server-reported progress from NDJSON /leads/generate-stream. */
  const [genStream, setGenStream] = useState({ stage: "", done: 0, total: 0, label: "" });
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [showEnrichPopup, setShowEnrichPopup] = useState(false);
  const [generatedLeads, setGeneratedLeads] = useState<any[]>([]);
  const [enriching, setEnriching] = useState(false);
  const [enrichPhase, setEnrichPhase] = useState<'validation' | 'enrichment' | 'complete'>('validation');
  const [enrichProgress, setEnrichProgress] = useState(0);
  const [enrichMessage, setEnrichMessage] = useState("Preparing enrichment...");
  const [suggestionLoadingTopic, setSuggestionLoadingTopic] = useState<string | null>(null);
  const suggestionPrompts = [
    "SaaS Founders",
    "Marketing Directors",
    "VP Sales in FinTech",
    "HR Leaders in IT Services",
    "Ecommerce Growth Managers",
    "Real Estate Brokerage Owners",
    "Healthcare Operations Heads",
    "Logistics Decision Makers",
  ];

  useEffect(() => {
    if (!suggestionLoadingTopic) return;
    let i = 0;
    setProgress(`${SUGGESTION_LOADING_PHASES[0]} · ${suggestionLoadingTopic}`);
    const id = window.setInterval(() => {
      i = (i + 1) % SUGGESTION_LOADING_PHASES.length;
      setProgress(`${SUGGESTION_LOADING_PHASES[i]} · ${suggestionLoadingTopic}`);
    }, 1200);
    return () => window.clearInterval(id);
  }, [suggestionLoadingTopic]);

  const genPct =
    generating && genStream.total > 0
      ? Math.min(100, Math.round((100 * genStream.done) / genStream.total))
      : 0;
  const genShowCounts =
    generating &&
    genStream.total > 0 &&
    genStream.stage !== "extract" &&
    ["search", "research", "save"].includes(genStream.stage);
  /** Backend often puts `done/total` in `label` (e.g. "Research 7/10"); avoid appending the same fraction again. */
  const genShowCountsExtra =
    genShowCounts &&
    !(typeof genStream.label === "string" && genStream.label.includes(`${genStream.done}/${genStream.total}`));

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt describing the leads you want to generate");
      return;
    }

    if (!activeBaseId) {
      setError("Please select a base first");
      return;
    }

    setGenStream({ stage: "extract", done: 0, total: 1, label: "Starting…" });
    setGenerating(true);
    setError("");
    setProgress("");

    try {
      const complete = await streamGenerateLeads(
        { prompt: prompt.trim(), base_id: activeBaseId, count },
        (e) => {
          setGenStream({
            stage: e.stage,
            done: e.done,
            total: e.total,
            label: e.label || "",
          });
        }
      );

      const rows = Array.isArray(complete.leads) ? complete.leads : [];
      if (rows.length > 0) {
        setGenStream((s) => ({
          ...s,
          done: rows.length,
          total: Math.max(rows.length, s.total || rows.length),
          label: "Complete",
        }));
        setProgress(`Successfully generated ${rows.length} leads!`);
        setGeneratedLeads(rows);
        onGenerated(rows);
        setTimeout(() => {
          setShowEnrichPopup(true);
          setPrompt("");
          setProgress("");
          setCount(10);
          setError("");
        }, 1500);
      } else {
        throw new Error("No leads were generated");
      }
    } catch (error: any) {
      console.error("AI generation error:", error);
      console.error("Error details:", {
        message: error?.message,
        name: error?.name,
        status: error?.status,
        response: error?.response?.data
      });
      
      // Extract error message - handle different error formats
      let errorMessage = "Failed to generate leads. Please try again.";
      
      // Priority 1: Use error.message if it's not just the class name
      if (error?.message && 
          error.message !== "APIError" && 
          error.message !== "BadRequestError" &&
          error.message !== "Error") {
        errorMessage = error.message;
      } 
      // Priority 2: Check response data message
      else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } 
      // Priority 3: Check response data error (if it's not just the class name)
      else if (error?.response?.data?.error && 
               error.response.data.error !== "BadRequestError" &&
               error.response.data.error !== "APIError") {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      setProgress("");
    } finally {
      setGenerating(false);
      setGenStream({ stage: "", done: 0, total: 0, label: "" });
    }
  };

  const handleSuggestionTopic = async (topic: string) => {
    setError("");
    setSuggestionLoadingTopic(topic);
    try {
      const response = await apiRequest("/ai/lead-prompt-from-suggestion", {
        method: "POST",
        body: JSON.stringify({
          topic,
          ...(activeBaseId ? { base_id: activeBaseId } : {}),
        }),
      });
      const p = typeof response?.prompt === "string" ? response.prompt.trim() : "";
      if (!p) {
        throw new Error("No prompt returned from AI");
      }
      setPrompt(p);
      setProgress("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not generate prompt";
      setError(msg);
      setProgress("");
      setPrompt(
        `Find B2B decision-makers for: ${topic}. Include specific job titles, industries, locations (e.g. United States or your target region), and company size (e.g. 50–500 employees or startups). Add signals that help narrow to qualified prospects.`
      );
    } finally {
      setSuggestionLoadingTopic(null);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes shimmer {
          0% { background-position: -240px 0; }
          100% { background-position: 240px 0; }
        }
        @keyframes generateBarShimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}} />

      <ImportModalFrame
        open={open}
        onClose={onClose}
        title="Generate leads with AI"
        subtitle="Build a clean ICP prompt, then generate qualified contacts for this workspace."
        headerTint="linear-gradient(165deg, rgba(99, 102, 241, 0.14) 0%, rgba(124, 58, 237, 0.08) 45%, transparent 72%)"
        icon={<GenerateLeadAIIcon size={36} sparklesSize={18} />}
        maxWidth={860}
        maxModalHeight="min(92vh, 900px)"
        closeDisabled={generating || Boolean(suggestionLoadingTopic)}
      >
        <div
          className="persona-ai-panel-reveal"
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            padding: "10px 12px",
            background: "var(--color-surface-secondary)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ minWidth: 0, flex: "1 1 200px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)", marginBottom: 2, lineHeight: 1.3 }}>
                Generate with AI
              </div>
              <p className="text-hint" style={{ margin: 0, fontSize: 11, lineHeight: 1.35, maxWidth: 560 }}>
                One-click suggestions, or type your full ICP in your own words. Same flow as campaign Knowledge base /
                Assistant — always open here (no upload step).
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {generating ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--color-primary, #7C3AED)",
                  }}
                  aria-live="polite"
                >
                  <span
                    style={{
                      width: 56,
                      height: 6,
                      borderRadius: 999,
                      background: "var(--color-border)",
                      overflow: "hidden",
                      display: "inline-block",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        height: "100%",
                        width: `${Math.max(4, genPct)}%`,
                        borderRadius: 999,
                        background:
                          "linear-gradient(90deg, #7c3aed 0%, #a78bfa 35%, #c4b5fd 50%, #a78bfa 65%, #7c3aed 100%)",
                        backgroundSize: "200% 100%",
                        animation: "generateBarShimmer 1.1s linear infinite",
                        transition: "width 0.12s ease-out",
                      }}
                    />
                  </span>
                  Generating
                </span>
              ) : null}
              {!generating && suggestionLoadingTopic ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--color-text-muted)",
                  }}
                >
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>
                    <Icons.Loader size={12} strokeWidth={2} aria-hidden />
                  </span>
                  Crafting…
                </span>
              ) : null}
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              Suggestions
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gridTemplateRows: "auto auto",
                gap: 8,
                paddingTop: 2,
              }}
            >
              {suggestionPrompts.map((item) => {
                const loadingChip = suggestionLoadingTopic === item;
                const disabled = generating || Boolean(suggestionLoadingTopic);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSuggestionTopic(item)}
                    disabled={disabled}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: loadingChip ? "6px 8px" : "4px 8px",
                      borderRadius: 9999,
                      border: loadingChip ? "1px solid var(--color-primary, #7C3AED)" : "1px solid var(--color-border)",
                      background: loadingChip ? "rgba(124, 58, 237, 0.14)" : "var(--color-surface)",
                      color: loadingChip ? "var(--color-primary, #7C3AED)" : "var(--color-text)",
                      fontSize: 11,
                      fontWeight: loadingChip ? 600 : 500,
                      lineHeight: 1.25,
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.55 : 1,
                      textAlign: "center",
                      minWidth: 0,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    {loadingChip ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            background:
                              "linear-gradient(90deg, rgba(99,102,241,0.14) 0%, rgba(167,139,250,0.35) 50%, rgba(99,102,241,0.14) 100%)",
                            backgroundSize: "200px 100%",
                            animation: "shimmer 1.15s linear infinite",
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>Crafting…</span>
                      </span>
                    ) : (
                      <>
                        <Icons.Sparkles size={11} strokeWidth={2} style={{ flexShrink: 0, color: "#7C3AED" }} aria-hidden />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="ai-lead-prompt"
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "#9ca3af",
                display: "block",
                marginBottom: 4,
              }}
            >
              Your words
            </label>
            <textarea
              id="ai-lead-prompt"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setError("");
              }}
              rows={5}
              placeholder="Short idea or full ICP — e.g. marketing directors, B2B SaaS, 50–200 employees, North America"
              disabled={generating || Boolean(suggestionLoadingTopic)}
              className="input"
              style={{
                width: "100%",
                fontSize: 12,
                lineHeight: 1.45,
                padding: "8px 12px",
                minHeight: 112,
                maxHeight: 220,
                resize: "vertical",
                borderRadius: 8,
                boxSizing: "border-box",
              }}
            />
          </div>

          {error ? (
            <div
              style={{
                padding: "10px 12px",
                background: "rgba(239, 68, 68, 0.09)",
                border: "1px solid rgba(239, 68, 68, 0.28)",
                borderRadius: 8,
                color: "#ef4444",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Icons.AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ whiteSpace: "pre-line", lineHeight: 1.5 }}>{error}</span>
            </div>
          ) : null}

          {progress && !generating && !suggestionLoadingTopic ? (
            <div
              style={{
                padding: "10px 12px",
                background: "rgba(34, 197, 94, 0.10)",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 8,
                color: "#16a34a",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Icons.CheckCircle size={17} />
              <span>{progress}</span>
            </div>
          ) : null}

          {generating ? (
            <div style={{ marginTop: 2 }} role="status" aria-live="polite" aria-label="Lead generation progress">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)" }}>
                  {genStream.label || progress || "Working on your request…"}
                  {genShowCountsExtra ? (
                    <span style={{ marginLeft: 6, color: "var(--color-primary, #7C3AED)", fontWeight: 700 }}>
                      {genStream.done}/{genStream.total}
                    </span>
                  ) : null}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary, #7C3AED)", fontVariantNumeric: "tabular-nums" }}>
                  {genPct}%
                </span>
              </div>
              <div
                style={{
                  height: 10,
                  borderRadius: 999,
                  background: "var(--color-border)",
                  overflow: "hidden",
                  border: "1px solid rgba(124, 58, 237, 0.12)",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(2, genPct)}%`,
                    borderRadius: 999,
                    background:
                      "linear-gradient(90deg, #5b21b6 0%, #7c3aed 22%, #a78bfa 45%, #ddd6fe 55%, #a78bfa 68%, #7c3aed 100%)",
                    backgroundSize: "220% 100%",
                    animation: "generateBarShimmer 1.05s linear infinite",
                    boxShadow: "0 0 12px rgba(124, 58, 237, 0.35)",
                    transition: "width 0.1s ease-out",
                  }}
                />
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              paddingTop: 4,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: "6px 10px",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>Number of leads</span>
              <input
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 10)))}
                className="input"
                style={{
                  width: 56,
                  padding: "4px 6px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-secondary)",
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: "center",
                }}
                disabled={generating || Boolean(suggestionLoadingTopic)}
              />
            </div>

            <div style={{ display: "flex", gap: 9 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
                disabled={generating || Boolean(suggestionLoadingTopic)}
                style={{ padding: "10px 16px", borderRadius: 8, fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleGenerate()}
                disabled={generating || Boolean(suggestionLoadingTopic) || !prompt.trim()}
                aria-busy={generating}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  padding: "10px 18px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {generating ? (
                  <>
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: `${Math.max(0, genPct)}%`,
                        background: "linear-gradient(90deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 100%)",
                        transition: "width 0.12s ease-out",
                        pointerEvents: "none",
                      }}
                    />
                    <span style={{ position: "relative", zIndex: 1, display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Icons.Sparkles size={15} />
                      Generating {genPct}%
                      {genShowCountsExtra ? ` (${genStream.done}/${genStream.total})` : ""}
                    </span>
                  </>
                ) : (
                  <>
                    <Icons.Sparkles size={15} />
                    Generate leads
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </ImportModalFrame>

      {/* Enrich & Score Popup */}
      {showEnrichPopup && (
        <div 
          style={{ 
            position:'fixed', 
            inset:0, 
            background:'rgba(0,0,0,.55)', 
            zIndex:2000, 
            display:'flex', 
            alignItems:'center', 
            justifyContent:'center', 
            padding:20,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => {
            setShowEnrichPopup(false);
            onClose();
          }}
        >
          <div 
            style={{ 
              width:'min(500px, 90vw)', 
              background:'var(--color-surface)', 
              border:'1px solid var(--color-border)', 
              borderRadius:16, 
              padding:0,
              boxShadow: '0 24px 64px var(--color-shadow)',
              animation: 'slideUp 0.3s ease-out',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-generate-success-title"
          >
            <div style={{
              padding: '18px 20px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-secondary)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(124, 58, 237, 0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icons.CheckCircle size={22} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 id="ai-generate-success-title" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                    Leads generated
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    You can enrich them now or continue in your table.
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ 
              padding: '28px',
              background: 'var(--elev-bg)'
            }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ 
                  padding: '16px 20px',
                  background: 'rgba(255, 193, 7, 0.1)',
                  border: '2px solid rgba(255, 193, 7, 0.3)',
                  borderRadius: 16,
                  marginBottom: 20
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <Icons.Mail size={24} style={{ color: '#ffc107', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14, color: '#ffc107' }}>
                        Email Information
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text)' }}>
                        Initial search results may include placeholder emails. Use <strong>Enrich & Score</strong> to get complete contact information including verified emails, phone numbers, and lead scores.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ 
                  padding: '16px 20px',
                  background: 'var(--color-surface-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 16,
                  marginBottom: 24
                }}>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--color-text)' }}>
                    <strong style={{ color: 'var(--color-text)' }}>What you&apos;ll get:</strong>
                    <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                      <li style={{ marginBottom: 6 }}>Verified email addresses</li>
                      <li style={{ marginBottom: 6 }}>Complete contact information</li>
                      <li style={{ marginBottom: 6 }}>Lead scoring and tier classification</li>
                      <li>Enhanced company and person insights</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ 
                display:'flex', 
                gap:12, 
                justifyContent:'flex-end'
              }}>
                <button 
                  className="btn-ghost" 
                  onClick={() => {
                    setShowEnrichPopup(false);
                    onClose();
                  }}
                  style={{
                    padding: '14px 24px',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                >
                  Skip for Now
                </button>
                <button 
                  onClick={async () => {
                    setShowEnrichPopup(false);
                    setEnriching(true);
                    setEnrichPhase('validation');
                    setEnrichProgress(0);
                    setEnrichMessage("Validating leads...");
                    
                    try {
                      // Phase 1: Validation
                      await new Promise(resolve => setTimeout(resolve, 500));
                      setEnrichProgress(20);
                      setEnrichMessage("Preparing for enrichment...");
                      
                      // Get lead IDs from generated leads
                      const leadIds = generatedLeads.map(lead => lead.id).filter(Boolean);
                      
                      if (leadIds.length === 0) {
                        throw new Error("No leads to enrich");
                      }
                      
                      setEnrichPhase('enrichment');
                      setEnrichProgress(30);
                      setEnrichMessage("Enriching leads...");
                      
                      // Phase 2: Enrichment
                      const response = await apiRequest("/leads/bulk-enrich", {
                        method: "POST",
                        body: JSON.stringify({ 
                          lead_ids: leadIds,
                          base_id: activeBaseId,
                          only_fullenrich: true // Set to true to skip Apollo and Anymail Finder, only run FullEnrich
                        })
                      });
                      
                      // Simulate progress updates
                      setEnrichProgress(60);
                      setEnrichMessage("Processing enriched data...");
                      await new Promise(resolve => setTimeout(resolve, 500));
                      
                      setEnrichProgress(80);
                      setEnrichMessage("Updating leads...");
                      await new Promise(resolve => setTimeout(resolve, 500));
                      
                      setEnrichProgress(100);
                      setEnrichPhase('complete');
                      setEnrichMessage(`Successfully enriched ${response.enriched || 0} leads!`);
                      
                      // Trigger refresh callback to update parent component
                      // This ensures the leads list is refreshed with updated data from database
                      if (onGenerated) {
                        // Wait a moment for database commits to complete
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        // Call onGenerated with empty array to trigger refresh (parent will fetch fresh data)
                        onGenerated([]);
                      }
                      
                      // Refresh leads after a delay
                      setTimeout(() => {
                        setEnriching(false);
                        onClose();
                      }, 2000);
                      
                    } catch (error: any) {
                      console.error("Enrichment error:", error);
                      setEnriching(false);
                      setError(error.message || "Failed to enrich leads");
                      setShowEnrichPopup(true);
                    }
                  }}
                  style={{
                    padding: '14px 32px',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: '0 8px 22px rgba(124, 58, 237, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 10px 28px rgba(124, 58, 237, 0.32)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 22px rgba(124, 58, 237, 0.28)';
                  }}
                >
                  <Icons.Target size={18} style={{ color: '#fff' }} />
                  <span>Enrich & Score</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enrichment Loader */}
      {enriching && (
        <EnrichmentLoader
          phase={enrichPhase}
          progress={enrichProgress}
          message={enrichMessage}
          onComplete={() => {
            setEnriching(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
