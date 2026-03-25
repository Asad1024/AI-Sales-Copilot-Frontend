"use client";
import { useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useBase } from "@/context/BaseContext";
import EnrichmentLoader from "./EnrichmentLoader";
import { Icons } from "@/components/ui/Icons";

type Props = { open: boolean; onClose: () => void; onGenerated: (rows: any[]) => void };

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
    setProgress(`AI is preparing a lead brief for "${topic}"...`);
    try {
      const response = await apiRequest("/ai/plan", {
        method: "POST",
        body: JSON.stringify({
          goal: `Generate high quality B2B leads for topic: ${topic}`,
          user_id: 1,
        }),
      });
      const plan = response?.plan || {};
      const audience = plan?.audience ? JSON.stringify(plan.audience) : `Target audience: ${topic}`;
      const leadSources = Array.isArray(plan?.lead_sources) ? plan.lead_sources.join(", ") : "";
      const generatedPrompt = `Topic: ${topic}
Audience details: ${audience}
Lead source preference: ${leadSources || "Verified business contacts"}
Need decision-maker leads with name, role, company, email, LinkedIn URL, industry, and region.`;
      setPrompt(generatedPrompt);
      setProgress("");
    } catch {
      setPrompt(`Find B2B leads for: ${topic}.
Include decision-makers with company size, location, and buying intent signals.
Return name, role, company, email, LinkedIn URL, and region.`);
      setProgress("");
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
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
      `}} />
      
      <div 
        style={{ 
          position:'fixed', 
          inset:0, 
          background:'rgba(0,0,0,.7)', 
          zIndex:1000, 
          display:'flex', 
          alignItems:'center', 
          justifyContent:'center', 
          padding:20,
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={onClose}
      >
        <div 
          style={{ 
            width:'min(800px, 96vw)', 
            maxHeight: '90vh',
            background:'var(--elev-bg)', 
            border:'1px solid var(--elev-border)', 
            borderRadius:16, 
            padding:0,
            boxShadow: 'var(--elev-shadow-lg)',
            animation: 'slideUp 0.3s ease-out',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            background: 'transparent',
            padding: '18px 20px',
            borderBottom: '1px solid var(--color-border)',
            position: 'relative'
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(76, 103, 255, 0.14)",
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icons.Sparkles size={18} strokeWidth={1.5} style={{ color: "var(--color-primary)" }} />
                </div>
                <div>
                  <h3 style={{ margin:0, fontSize:18, fontWeight:700, color:'var(--color-text)' }}>
                    Generate Leads with AI
                  </h3>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--color-text-muted)' }}>
                    Create precise search prompts and generate qualified leads.
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                disabled={generating}
                style={{ 
                  padding: '8px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  color: 'var(--color-text)',
                  cursor: generating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icons.X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ 
            padding: '28px',
            overflowY: 'auto',
            flex: 1,
            background: 'var(--elev-bg)'
          }}>
            <div style={{ display:'grid', gap:20 }}>
              {/* Prompt Input */}
              <div style={{ width: '100%' }}>
                <label style={{ 
                  marginBottom:12, 
                  fontSize:14, 
                  fontWeight:700,
                  color: 'var(--color-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%'
                }}>
                  <Icons.Target size={18} style={{ color: 'var(--color-text)' }} />
                  Describe your target leads
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8, marginBottom: 12 }}>
                  {suggestionPrompts.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleSuggestionTopic(item)}
                      disabled={generating || suggestionLoadingTopic === item}
                      style={{
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface-secondary)",
                        color: "var(--color-text)",
                        borderRadius: 8,
                        fontSize: 12,
                        padding: "8px 10px",
                        height: "auto",
                        cursor: generating ? "not-allowed" : "pointer",
                        textAlign: "left",
                        lineHeight: 1.35,
                      }}
                    >
                      {suggestionLoadingTopic === item ? "Generating..." : item}
                    </button>
                  ))}
                </div>
                <textarea 
                  className="input" 
                  rows={6} 
                  placeholder="Example: Find marketing directors at B2B SaaS companies with 50-200 employees, located in North America, using HubSpot or Salesforce, interested in marketing automation tools"
                  value={prompt} 
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    setError("");
                  }}
                  disabled={generating}
                  style={{ 
                    width: '100%',
                    fontSize: 15, 
                    lineHeight: 1.7,
                    padding: '16px 20px',
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    transition: 'all 0.2s ease',
                    resize: 'vertical',
                    minHeight: 120,
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.background = 'var(--color-surface)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.background = 'var(--color-surface)';
                  }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <input
                    value={promptIdea}
                    onChange={(e) => setPromptIdea(e.target.value)}
                    placeholder="Need help writing prompt? Enter your idea and use AI Assist"
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      color: "var(--color-text)",
                      fontSize: 13,
                      padding: "10px 12px",
                    }}
                  />
                  <button type="button" className="btn-ghost" onClick={handleBuildPrompt} style={{ borderRadius: 10 }}>
                    <Icons.Lightbulb size={16} />
                    AI Assist
                  </button>
                </div>
                <div style={{ 
                  fontSize:13, 
                  color:'var(--color-text-muted)', 
                  marginTop:10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'var(--color-surface-secondary)',
                  borderRadius: 10,
                  border: '1px solid var(--color-border)'
                }}>
                  <Icons.Lightbulb size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <span><strong>Tip:</strong> Be specific! Include industry, company size, location, technology, or other criteria for better results</span>
                </div>
              </div>

              {/* Count Input */}
              <div style={{ 
                display:'flex', 
                gap:16, 
                alignItems:'center',
                padding: '16px 20px',
                background: 'var(--color-surface-secondary)',
                borderRadius: 16,
                border: '1px solid var(--color-border)'
              }}>
                <label style={{ 
                  fontSize:14, 
                  fontWeight:700,
                  color: 'var(--color-text)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Icons.Users size={18} style={{ color: 'var(--color-text)' }} />
                  Number of leads:
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={count}
                  onChange={(e) => setCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 10)))}
                  className="input"
                  style={{ 
                    width: 100,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    fontSize: 15,
                    fontWeight: 600,
                    textAlign: 'center'
                  }}
                  disabled={generating}
                />
                <span style={{ fontSize:13, color:'var(--color-text-muted)', fontWeight: 500 }}>
                  (1-100 leads)
                </span>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, rgba(255, 87, 87, 0.15) 0%, rgba(255, 107, 107, 0.1) 100%)',
                  border: '2px solid rgba(255, 87, 87, 0.4)',
                  borderRadius: 16,
                  color: '#ff5757',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  animation: 'slideUp 0.3s ease-out'
                }}>
                  <Icons.AlertCircle size={20} style={{ color: '#ff5757', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ whiteSpace: 'pre-line', lineHeight: 1.6, flex: 1 }}>{error}</span>
                </div>
              )}

              {/* Progress Message */}
              {progress && (
                <div style={{
                  padding: '18px 24px',
                  background: generating 
                    ? 'var(--color-surface-secondary)' 
                    : 'rgba(76, 175, 80, 0.1)',
                  border: `1px solid ${generating ? 'var(--color-border)' : 'rgba(76, 175, 80, 0.35)'}`,
                  borderRadius: 16,
                  color: generating ? 'var(--color-primary)' : '#4CAF50',
                  fontSize: 15,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  animation: 'slideUp 0.3s ease-out'
                }}>
                  {generating && (
                    <span style={{ 
                      display: 'inline-block', 
                      animation: 'spin 1s linear infinite'
                    }}>
                      <Icons.Loader size={20} style={{ color: 'var(--color-primary)' }} />
                    </span>
                  )}
                  {!generating && <Icons.CheckCircle size={20} style={{ color: '#4CAF50', flexShrink: 0 }} />}
                  <span>{progress}</span>
                </div>
              )}

              {/* Info Box */}
              <div style={{ 
                padding: '20px 24px', 
                background: 'var(--color-surface-secondary)', 
                borderRadius: 16,
                fontSize: 13,
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderTop: '3px solid var(--color-primary)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
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
                    <Icons.Target size={20} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div style={{ flex: 1, paddingTop: 2 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14, color: 'var(--color-text)' }}>
                      AI-Powered Lead Generation
                    </div>
                    <div style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
                      Searches <strong style={{ color: 'var(--color-text)' }}>real contacts</strong> from verified databases and enriches with comprehensive insights including company news, funding details, tech stack, and industry trends.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ 
                display:'flex', 
                gap:12, 
                justifyContent:'flex-end', 
                marginTop:8,
                paddingTop: 20,
                borderTop: '1px solid var(--color-border)'
              }}>
                <button 
                  className="btn-ghost" 
                  onClick={onClose}
                  disabled={generating}
                  style={{
                    padding: '14px 24px',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    opacity: generating ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim()}
                  style={{
                    padding: '14px 32px',
                    background: generating || !prompt.trim()
                      ? 'var(--color-surface-secondary)'
                      : 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: generating || !prompt.trim() ? 'not-allowed' : 'pointer',
                    opacity: generating || !prompt.trim() ? 0.6 : 1,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: generating || !prompt.trim() 
                      ? 'none' 
                      : '0 8px 22px rgba(76, 103, 255, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                  onMouseEnter={(e) => {
                    if (!generating && prompt.trim()) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 10px 28px rgba(76, 103, 255, 0.32)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!generating && prompt.trim()) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 8px 22px rgba(76, 103, 255, 0.28)';
                    }
                  }}
                >
                  {generating ? (
                    <>
                      <span style={{ 
                        display: 'inline-block', 
                        animation: 'spin 1s linear infinite'
                      }}>
                        <Icons.Loader size={18} style={{ color: '#fff' }} />
                      </span>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Sparkles size={18} style={{ color: '#fff' }} />
                      <span>Generate {count} Lead{count !== 1 ? 's' : ''}</span>
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
