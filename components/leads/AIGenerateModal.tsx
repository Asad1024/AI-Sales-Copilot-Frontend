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
      setError(error.message || "Failed to generate leads. Please try again.");
      setProgress("");
    } finally {
      setGenerating(false);
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
            background:'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', 
            border:'1px solid rgba(76, 103, 255, 0.3)', 
            borderRadius:24, 
            padding:0,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(76, 103, 255, 0.1)',
            animation: 'slideUp 0.3s ease-out',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div style={{
            background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 50%, #FF6B6B 100%)',
            padding: '24px 28px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', position: 'relative', zIndex: 1 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    color: 'white'
                  }}>
                    <Icons.Sparkles size={24} />
                  </div>
                  <h3 style={{ margin:0, fontSize:24, fontWeight:800, color:'white', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    Generate Leads with AI
                  </h3>
                </div>
                <p style={{ margin:'0 0 0 60px', fontSize:14, color:'rgba(255,255,255,0.9)', fontWeight:500 }}>
                  Search and discover qualified leads with AI-powered insights
                </p>
              </div>
              <button 
                onClick={onClose}
                disabled={generating}
                style={{ 
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  color: 'white',
                  cursor: generating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(10px)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  if (!generating) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!generating) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <Icons.X size={18} />
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
                    borderRadius: 16,
                    border: '2px solid rgba(76, 103, 255, 0.2)',
                    background: 'rgba(76, 103, 255, 0.03)',
                    transition: 'all 0.2s ease',
                    resize: 'vertical',
                    minHeight: 120,
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.5)';
                    e.currentTarget.style.background = 'rgba(76, 103, 255, 0.05)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.2)';
                    e.currentTarget.style.background = 'rgba(76, 103, 255, 0.03)';
                  }}
                />
                <div style={{ 
                  fontSize:13, 
                  color:'var(--color-text-muted)', 
                  marginTop:10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'rgba(255, 193, 7, 0.1)',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 193, 7, 0.2)'
                }}>
                  <Icons.Lightbulb size={16} style={{ color: '#ffc107', flexShrink: 0 }} />
                  <span><strong>Tip:</strong> Be specific! Include industry, company size, location, technology, or other criteria for better results</span>
                </div>
              </div>

              {/* Count Input */}
              <div style={{ 
                display:'flex', 
                gap:16, 
                alignItems:'center',
                padding: '16px 20px',
                background: 'rgba(169, 76, 255, 0.05)',
                borderRadius: 16,
                border: '1px solid rgba(169, 76, 255, 0.15)'
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
                    border: '2px solid rgba(169, 76, 255, 0.3)',
                    background: 'rgba(169, 76, 255, 0.05)',
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
                  alignItems: 'center',
                  gap: 12,
                  animation: 'slideUp 0.3s ease-out'
                }}>
                  <Icons.AlertCircle size={20} style={{ color: '#ff5757', flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Progress Message */}
              {progress && (
                <div style={{
                  padding: '18px 24px',
                  background: generating 
                    ? 'linear-gradient(135deg, rgba(76, 103, 255, 0.15) 0%, rgba(169, 76, 255, 0.15) 100%)' 
                    : 'linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.1) 100%)',
                  border: `2px solid ${generating ? 'rgba(76, 103, 255, 0.4)' : 'rgba(76, 175, 80, 0.4)'}`,
                  borderRadius: 16,
                  color: generating ? '#4C67FF' : '#4CAF50',
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
                      <Icons.Loader size={20} style={{ color: '#4C67FF' }} />
                    </span>
                  )}
                  {!generating && <Icons.CheckCircle size={20} style={{ color: '#4CAF50', flexShrink: 0 }} />}
                  <span>{progress}</span>
                </div>
              )}

              {/* Info Box */}
              <div style={{ 
                padding: '20px 24px', 
                background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%)', 
                borderRadius: 16,
                fontSize: 13,
                color: 'var(--color-text)',
                border: '2px solid rgba(76, 103, 255, 0.2)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: 'linear-gradient(90deg, #4C67FF 0%, #A94CFF 50%, #4C67FF 100%)',
                  backgroundSize: '200% 100%',
                  animation: generating ? 'shimmer 2s infinite' : 'none'
                }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(76, 103, 255, 0.3)',
                    color: 'white'
                  }}>
                    <Icons.Target size={20} />
                  </div>
                  <div style={{ flex: 1, paddingTop: 2 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14, color: '#4C67FF' }}>
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
                borderTop: '1px solid rgba(255,255,255,0.1)'
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
                      ? 'rgba(128, 128, 128, 0.3)'
                      : 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: generating || !prompt.trim() ? 'not-allowed' : 'pointer',
                    opacity: generating || !prompt.trim() ? 0.6 : 1,
                    transition: 'all 0.3s ease',
                    boxShadow: generating || !prompt.trim() 
                      ? 'none' 
                      : '0 4px 16px rgba(76, 103, 255, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!generating && prompt.trim()) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 103, 255, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!generating && prompt.trim()) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(76, 103, 255, 0.4)';
                    }
                  }}
                >
                  {generating ? (
                    <>
                      <span style={{ 
                        display: 'inline-block', 
                        animation: 'spin 1s linear infinite'
                      }}>
                        <Icons.Loader size={18} style={{ color: 'white' }} />
                      </span>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Sparkles size={18} style={{ color: 'white' }} />
                      <span>Generate {count} Lead{count !== 1 ? 's' : ''}</span>
                    </>
                  )}
                  {!generating && prompt.trim() && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                      animation: 'shimmer 2s infinite'
                    }} />
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
            background:'rgba(0,0,0,.8)', 
            zIndex:2000, 
            display:'flex', 
            alignItems:'center', 
            justifyContent:'center', 
            padding:20,
            backdropFilter: 'blur(8px)',
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
              background:'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', 
              border:'2px solid rgba(76, 103, 255, 0.4)', 
              borderRadius:24, 
              padding:0,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(76, 103, 255, 0.2)',
              animation: 'slideUp 0.3s ease-out',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
              padding: '24px 28px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  color: 'white'
                }}>
                  <Icons.CheckCircle size={24} />
                </div>
                <h3 style={{ margin:0, fontSize:22, fontWeight:800, color:'white', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  Leads Generated Successfully!
                </h3>
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
                  background: 'rgba(76, 103, 255, 0.08)',
                  border: '1px solid rgba(76, 103, 255, 0.2)',
                  borderRadius: 16,
                  marginBottom: 24
                }}>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--color-text)' }}>
                    <strong style={{ color: '#4C67FF' }}>What you'll get:</strong>
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
                    background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 16px rgba(76, 103, 255, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 103, 255, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(76, 103, 255, 0.4)';
                  }}
                >
                  <Icons.Target size={18} style={{ color: 'white' }} />
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
