"use client";
import { useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useBaseStore } from "@/stores/useBaseStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useNotification } from "@/context/NotificationContext";
import { Icons } from "@/components/ui/Icons";

interface ScoreModalProps {
  open: boolean;
  onClose: () => void;
  onScored?: () => void;
}

export function ScoreModal({ open, onClose, onScored }: ScoreModalProps) {
  const { activeBaseId } = useBaseStore();
  const { selectedLeads, leads } = useLeadStore();
  const { showSuccess, showError, showWarning } = useNotification();
  
  const [purpose, setPurpose] = useState("");
  const [scoring, setScoring] = useState(false);
  const [progress, setProgress] = useState("");
  const [scoreScope, setScoreScope] = useState<'selected' | 'all'>('selected');

  if (!open) return null;

  const handleScore = async () => {
    if (!activeBaseId) {
      showError("Error", "Please select a base first");
      return;
    }

    const leadsToScore = scoreScope === 'selected' ? selectedLeads : leads.map(l => l.id);
    
    if (leadsToScore.length === 0) {
      showError("No Leads", scoreScope === 'selected' 
        ? "Please select leads to score" 
        : "No leads available to score");
      return;
    }

    setScoring(true);
    setProgress("Starting scoring...");

    try {
      let successCount = 0;
      let errorCount = 0;
      const total = leadsToScore.length;

      for (let i = 0; i < leadsToScore.length; i++) {
        const leadId = leadsToScore[i];
        setProgress(`Scoring lead ${i + 1} of ${total}...`);

        try {
          await apiRequest(`/leads/${leadId}`, {
            method: "PUT",
            body: JSON.stringify({
              score: true,
              purpose: purpose.trim() || undefined
            })
          });
          successCount++;
        } catch (error: any) {
          console.error(`Failed to score lead ${leadId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        setProgress(`Successfully scored ${successCount} lead(s)!`);
        if (errorCount > 0) {
          showWarning("Scoring Complete", `Scored ${successCount} lead(s), but ${errorCount} failed.`);
        } else {
          showSuccess("Scoring Complete", `Successfully scored ${successCount} lead(s)`);
        }
        
        setTimeout(() => {
          setScoring(false);
          setProgress("");
          setPurpose("");
          onScored?.();
          onClose();
        }, 1500);
      } else {
        throw new Error("Failed to score any leads");
      }
    } catch (error: any) {
      console.error("Scoring error:", error);
      showError("Scoring Failed", error?.message || "Failed to score leads. Please try again.");
      setProgress("");
      setScoring(false);
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
      `}} />
      
      <div 
        style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,.7)', 
          zIndex: 1000, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: 20,
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={onClose}
      >
        <div 
          style={{ 
            width: 'min(600px, 96vw)', 
            maxHeight: '90vh',
            background: 'var(--color-surface)', 
            border: '1px solid var(--elev-border)', 
            borderRadius: 16, 
            padding: 0,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.3s ease-out',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icons.Target size={24} style={{ color: '#000' }} />
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#000' }}>
                Score Leads
              </h3>
            </div>
            <button
              onClick={onClose}
              className="icon-btn"
              style={{ 
                width: '32px', 
                height: '32px', 
                padding: 0,
                background: 'rgba(0,0,0,0.1)',
                borderRadius: '8px'
              }}
            >
              <Icons.X size={18} style={{ color: '#000' }} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            {scoring ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  border: '4px solid rgba(76, 103, 255, 0.2)',
                  borderTopColor: '#4C67FF',
                  borderRadius: '50%',
                  margin: '0 auto 20px',
                  animation: 'spin 1s linear infinite'
                }} />
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  {progress || "Scoring leads..."}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Analyzing leads with AI...
                </div>
              </div>
            ) : (
              <>
                {/* Scope Selection */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 14, 
                    fontWeight: 600, 
                    marginBottom: 12,
                    color: 'var(--color-text)'
                  }}>
                    Select Leads to Score
                  </label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setScoreScope('selected')}
                      disabled={selectedLeads.length === 0}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: scoreScope === 'selected' 
                          ? '2px solid #4C67FF' 
                          : '1px solid var(--elev-border)',
                        background: scoreScope === 'selected'
                          ? 'rgba(76, 103, 255, 0.1)'
                          : 'var(--color-surface-secondary)',
                        color: 'var(--color-text)',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: selectedLeads.length === 0 ? 'not-allowed' : 'pointer',
                        opacity: selectedLeads.length === 0 ? 0.5 : 1
                      }}
                    >
                      Selected ({selectedLeads.length})
                    </button>
                    <button
                      onClick={() => setScoreScope('all')}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: scoreScope === 'all' 
                          ? '2px solid #4C67FF' 
                          : '1px solid var(--elev-border)',
                        background: scoreScope === 'all'
                          ? 'rgba(76, 103, 255, 0.1)'
                          : 'var(--color-surface-secondary)',
                        color: 'var(--color-text)',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      All ({leads.length})
                    </button>
                  </div>
                </div>

                {/* Purpose (Optional) */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 14, 
                    fontWeight: 600, 
                    marginBottom: 8,
                    color: 'var(--color-text)'
                  }}>
                    Purpose / Context (Optional)
                  </label>
                  <textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g., Looking for SaaS founders in fintech space..."
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--elev-border)',
                      background: 'var(--color-surface-secondary)',
                      color: 'var(--color-text)',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ 
                    fontSize: 12, 
                    color: 'var(--color-text-muted)', 
                    marginTop: 6 
                  }}>
                    Helps AI provide more accurate scoring based on your goals
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={onClose}
                    className="btn-ghost"
                    style={{ flex: 1, padding: '12px' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleScore}
                    disabled={scoring || (scoreScope === 'selected' && selectedLeads.length === 0)}
                    className="btn-primary"
                    style={{ 
                      flex: 1, 
                      padding: '12px',
                      opacity: (scoreScope === 'selected' && selectedLeads.length === 0) ? 0.5 : 1,
                      cursor: (scoreScope === 'selected' && selectedLeads.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {scoring ? "Scoring..." : `Score ${scoreScope === 'selected' ? selectedLeads.length : leads.length} Lead(s)`}
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

