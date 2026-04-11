"use client";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useBase } from "@/context/BaseContext";
import EnrichmentLoader from "./EnrichmentLoader";
import { Icons } from "@/components/ui/Icons";

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
  const [promptIdea, setPromptIdea] = useState("");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
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

  if (!open) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt describing the leads you want to generate");
      return;
    }

    if (!activeBaseId) {
      setError("Please select a base first");
      return;
    }

    setGenerating(true);
    setError("");
    setProgress("Searching for leads...");

    try {
      setProgress("Searching database...");
      
      const response = await apiRequest("/leads/generate", {
        method: "POST",
        body: JSON.stringify({
          prompt: prompt.trim(),
          base_id: activeBaseId,
          count: count
        })
      });

      if (response?.leads && response.leads.length > 0) {
        setProgress(`Successfully generated ${response.leads.length} leads!`);
        setGeneratedLeads(response.leads);
        onGenerated(response.leads);
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
    }
  };

  const handleBuildPrompt = () => {
    const idea = promptIdea.trim();
    if (!idea) {
      setError("Write a short idea first, then click AI Assist.");
      return;
    }
    const built = `Find B2B leads matching this intent: ${idea}.
Include: decision-maker role, company size, location, industry, and buying signals.
Return contacts with name, role, company, email, LinkedIn URL, and region.`;
    setPrompt(built);
    setError("");
  };

  const handleSuggestionTopic = async (topic: string) => {
    setError("");
    setSuggestionLoadingTopic(topic);
    try {
      const response = await apiRequest("/ai/lead-prompt-from-suggestion", {
        method: "POST",
        body: JSON.stringify({ topic }),
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
        @keyframes aiPulse {
          0%, 100% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.02); opacity: 1; }
        }
      `}} />
      
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 6, 23, 0.66)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          backdropFilter: "blur(10px)",
          animation: "fadeIn 0.2s ease-out",
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: "min(860px, 96vw)",
            maxHeight: "90vh",
            background: "var(--elev-bg)",
            border: "1px solid rgba(148, 163, 184, 0.22)",
            borderRadius: 22,
            boxShadow: "0 28px 70px rgba(2, 6, 23, 0.35), 0 10px 30px rgba(2, 6, 23, 0.18)",
            animation: "slideUp 0.28s ease-out",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: "20px 22px 12px",
              borderBottom: "1px solid rgba(148, 163, 184, 0.18)",
              background:
                "linear-gradient(180deg, rgba(99, 102, 241, 0.10) 0%, rgba(99, 102, 241, 0.00) 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "linear-gradient(145deg, rgba(99,102,241,0.22), rgba(79,70,229,0.12))",
                    display: "grid",
                    placeItems: "center",
                    border: "1px solid rgba(99, 102, 241, 0.22)",
                  }}
                >
                  <Icons.Sparkles size={18} strokeWidth={1.7} style={{ color: "#4F46E5" }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>
                    Generate Leads with AI model
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
                    Build a clean ICP prompt, then generate qualified contacts.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={generating}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: "1px solid rgba(148, 163, 184, 0.28)",
                  background: "transparent",
                  cursor: generating ? "not-allowed" : "pointer",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--color-text-muted)",
                }}
              >
                <Icons.X size={16} />
              </button>
            </div>
          </div>

          <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>
            <div
              style={{
                display: "grid",
                gap: 12,
                background: "#F8FAFC",
                borderRadius: 16,
                padding: 14,
                border: "1px solid rgba(15, 23, 42, 0.06)",
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--color-text)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Icons.Target size={16} />
                Describe your target leads
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8 }}>
                {suggestionPrompts.map((item) => {
                  const loadingChip = suggestionLoadingTopic === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleSuggestionTopic(item)}
                      disabled={generating || Boolean(suggestionLoadingTopic)}
                      style={{
                        border: loadingChip ? "1px solid rgba(99,102,241,0.42)" : "1px solid rgba(148,163,184,0.35)",
                        background: loadingChip
                          ? "linear-gradient(135deg, rgba(224,231,255,0.95), rgba(243,232,255,0.95))"
                          : "rgba(255,255,255,0.9)",
                        borderRadius: 10,
                        minHeight: 36,
                        padding: "8px 10px",
                        fontSize: 12,
                        lineHeight: 1.2,
                        color: "var(--color-text)",
                        textAlign: "left",
                        cursor: generating || suggestionLoadingTopic ? "not-allowed" : "pointer",
                        boxShadow: loadingChip ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
                      }}
                    >
                      {loadingChip ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 999,
                              background:
                                "linear-gradient(90deg, rgba(99,102,241,0.14) 0%, rgba(167,139,250,0.35) 50%, rgba(99,102,241,0.14) 100%)",
                              backgroundSize: "220px 100%",
                              animation: "shimmer 1.15s linear infinite",
                            }}
                          />
                          <span style={{ fontWeight: 600, animation: "aiPulse 1.3s ease-in-out infinite" }}>
                            Crafting...
                          </span>
                        </span>
                      ) : (
                        item
                      )}
                    </button>
                  );
                })}
              </div>

              <textarea
                className="input"
                rows={6}
                placeholder="Example: Find marketing directors at B2B SaaS companies with 50-200 employees in North America using HubSpot or Salesforce."
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setError("");
                }}
                disabled={generating}
                style={{
                  width: "100%",
                  fontSize: 14,
                  lineHeight: 1.65,
                  padding: "14px 15px",
                  borderRadius: 14,
                  border: "1px solid transparent",
                  background: "rgba(255,255,255,0.92)",
                  resize: "vertical",
                  minHeight: 120,
                  boxSizing: "border-box",
                  boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.08)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(99,102,241,0.15), inset 0 0 0 1px rgba(99,102,241,0.32)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(15,23,42,0.08)";
                }}
              />

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={promptIdea}
                  onChange={(e) => setPromptIdea(e.target.value)}
                  placeholder="Need help? Write a short idea..."
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    border: "1px solid rgba(148, 163, 184, 0.4)",
                    background: "rgba(255,255,255,0.92)",
                    color: "var(--color-text)",
                    fontSize: 13,
                    padding: "10px 11px",
                  }}
                />
                <button type="button" className="btn-ghost" onClick={handleBuildPrompt} style={{ borderRadius: 10, minHeight: 36 }}>
                  <Icons.Lightbulb size={15} />
                  AI Assist
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  marginTop: 12,
                  padding: "12px 14px",
                  background: "rgba(239, 68, 68, 0.09)",
                  border: "1px solid rgba(239, 68, 68, 0.28)",
                  borderRadius: 12,
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
            )}

            {progress && (
              <div
                style={{
                  marginTop: 12,
                  padding: "12px 14px",
                  background: generating ? "rgba(99, 102, 241, 0.08)" : "rgba(34, 197, 94, 0.10)",
                  border: `1px solid ${generating ? "rgba(99,102,241,0.22)" : "rgba(34,197,94,0.25)"}`,
                  borderRadius: 12,
                  color: generating ? "#4F46E5" : "#16a34a",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {generating ? (
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>
                    <Icons.Loader size={17} />
                  </span>
                ) : (
                  <Icons.CheckCircle size={17} />
                )}
                <span>{progress}</span>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 14 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(148,163,184,0.35)",
                  borderRadius: 11,
                  padding: "7px 10px",
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
                    width: 66,
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid rgba(148,163,184,0.45)",
                    background: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                  disabled={generating}
                />
              </div>

              <div style={{ display: "flex", gap: 9 }}>
                <button
                  className="btn-ghost"
                  onClick={onClose}
                  disabled={generating}
                  style={{ padding: "11px 16px", borderRadius: 11, fontSize: 14, opacity: generating ? 0.55 : 1 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim()}
                  style={{
                    padding: "11px 18px",
                    background: generating || !prompt.trim()
                      ? "var(--color-surface-secondary)"
                      : "radial-gradient(120% 120% at 0% 0%, #6366F1 0%, #4F46E5 45%, #312E81 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 11,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: generating || !prompt.trim() ? "not-allowed" : "pointer",
                    opacity: generating || !prompt.trim() ? 0.65 : 1,
                    boxShadow: generating || !prompt.trim() ? "none" : "0 10px 24px rgba(79, 70, 229, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {generating ? (
                    <>
                      <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>
                        <Icons.Loader size={16} style={{ color: "#fff" }} />
                      </span>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Sparkles size={15} style={{ color: "#fff" }} />
                      <span>Generate {count} Lead{count !== 1 ? "s" : ""}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  background: 'rgba(76, 103, 255, 0.14)',
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
                    boxShadow: '0 8px 22px rgba(76, 103, 255, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 10px 28px rgba(76, 103, 255, 0.32)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 22px rgba(76, 103, 255, 0.28)';
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
