"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBase } from '@/context/BaseContext';
import { apiRequest } from '@/lib/apiClient';
import { Icons } from './Icons';
import { useNotification } from '@/context/NotificationContext';
import { goToNewCampaignOrWorkspaces } from '@/lib/goToNewCampaign';

interface OnboardingWizardProps {
  onComplete?: () => void;
}

type WizardStep = 'base' | 'leads' | 'enrich' | 'campaign';

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const router = useRouter();
  const { showError } = useNotification();
  const { bases, activeBaseId, refreshBases } = useBase();
  const [currentStep, setCurrentStep] = useState<WizardStep>('base');
  const [loading, setLoading] = useState(true);
  const [leadsCount, setLeadsCount] = useState(0);
  const [enrichedLeadsCount, setEnrichedLeadsCount] = useState(0);
  const [campaignsCount, setCampaignsCount] = useState(0);
  const [showBaseModal, setShowBaseModal] = useState(false);
  const [newBaseName, setNewBaseName] = useState('');
  const [showBaseSelector, setShowBaseSelector] = useState(false);

  // Check progress
  useEffect(() => {
    const checkProgress = async () => {
      setLoading(true);
      await refreshBases();

      // If no bases, stay on base step
      if (bases.length === 0) {
        setCurrentStep('base');
        setLoading(false);
        return;
      }

      // Check leads if we have an active base
      if (activeBaseId) {
        try {
          // Fetch leads
          const leadsData = await apiRequest(`/leads?base_id=${activeBaseId}`);
          const leads = leadsData?.leads || [];
          const enrichedLeads = leads.filter((lead: any) => lead.score !== null && lead.score !== undefined);
          
          setLeadsCount(leads.length);
          setEnrichedLeadsCount(enrichedLeads.length);

          // Fetch campaigns
          let campaignsList: any[] = [];
          try {
            const campaignsData = await apiRequest(`/campaigns?base_id=${activeBaseId}`);
            campaignsList = campaignsData?.campaigns || [];
            setCampaignsCount(campaignsList.length);
          } catch (err) {
            setCampaignsCount(0);
          }

          // Determine current step
          if (leads.length === 0) {
            setCurrentStep('leads');
          } else if (enrichedLeads.length === 0) {
            setCurrentStep('enrich');
          } else if (campaignsList.length === 0) {
            setCurrentStep('campaign');
          } else {
            // All steps completed - hide wizard
            if (onComplete) onComplete();
            return;
          }
        } catch (error) {
          console.error('Failed to check progress:', error);
          if (bases.length > 0) {
            setCurrentStep('leads');
          }
        }
      } else {
        setCurrentStep('base');
      }

      setLoading(false);
    };

    checkProgress();
  }, [bases.length, activeBaseId, refreshBases, onComplete]);

  const createBase = async () => {
    if (!newBaseName.trim()) return;
    
    try {
      setLoading(true);
      const response = await apiRequest('/bases', {
        method: 'POST',
        body: JSON.stringify({ user_id: 1, name: newBaseName.trim() })
      });
      await refreshBases();
      setShowBaseModal(false);
      setNewBaseName('');
      // Auto-advance to leads step
      setTimeout(() => {
        setCurrentStep('leads');
      }, 500);
    } catch (error: any) {
      console.error('Failed to create base:', error);
      showError('Create failed', error.message || 'Failed to create base. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectBase = async (baseId: number) => {
    const base = bases.find(b => b.id === baseId);
    if (base) {
      // The BaseContext should handle setting active base
      // For now, just refresh and move to next step
      await refreshBases();
      setCurrentStep('leads');
    }
  };

  if (loading && bases.length === 0) {
    return null; // Don't show while initial loading
  }

  // Don't show if all steps are complete
  if (bases.length > 0 && leadsCount > 0 && enrichedLeadsCount > 0 && campaignsCount > 0) {
    return null;
  }

  return (
    <div className="card-enhanced" style={{
      marginBottom: '24px',
      padding: '20px 22px',
      borderRadius: '14px',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      background: 'radial-gradient(circle at center, rgba(var(--color-primary-rgb), 0.2), rgba(255, 255, 255, 0.02) 70%)'
    }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          margin: '0 0 8px 0',
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #F29F67 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Get Started with Leads Reach
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
          Follow these steps to set up your first campaign
        </p>
      </div>

      {/* Progress Steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px', overflowX: 'auto' }}>
        {[
          { id: 'base', label: 'Create Base', icon: <Icons.Folder size={14} /> },
          { id: 'leads', label: 'Add Leads', icon: <Icons.Users size={14} /> },
          { id: 'enrich', label: 'Enrich & Score', icon: <Icons.Sparkles size={14} /> },
          { id: 'campaign', label: 'Create Campaign', icon: <Icons.Rocket size={14} /> }
        ].map((step, index) => {
          const stepId = step.id as WizardStep;
          const isActive = currentStep === stepId;
          const isCompleted = 
            (stepId === 'base' && bases.length > 0) ||
            (stepId === 'leads' && leadsCount > 0) ||
            (stepId === 'enrich' && enrichedLeadsCount > 0) ||
            (stepId === 'campaign' && campaignsCount > 0);
          
          return (
            <React.Fragment key={stepId}>
              <div style={{
                minWidth: '120px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '999px',
                  border: isActive ? '1.5px solid var(--color-primary)' : isCompleted ? '1.5px solid #10b981' : '1.5px solid var(--color-border)',
                  background: isActive ? 'rgba(var(--color-primary-rgb), 0.2)' : isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.03)',
                  color: isActive ? 'var(--color-primary)' : isCompleted ? '#10b981' : 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isCompleted ? <Icons.Check size={14} /> : step.icon}
                </div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: isActive ? 'var(--color-primary)' : isCompleted ? '#10b981' : 'var(--color-text-muted)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap'
                }}>
                  {step.label}
                </div>
              </div>
              {index < 3 && (
                <div style={{
                  width: '42px',
                  height: '2px',
                  borderRadius: '999px',
                  background: isCompleted ? 'linear-gradient(90deg, #10b981 0%, var(--color-primary) 100%)' : 'rgba(255,255,255,0.16)',
                  marginTop: '-14px'
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      {currentStep === 'base' && (
        <div>
          {bases.length === 0 ? (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0' }}>
                Step 1: Create a new workspace to organize leads and campaigns
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 20px 0' }}>
                Create a workspace (base) to organize your leads and campaigns. You can create multiple bases for different projects or audiences.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowBaseModal(true)}
                  className="btn-primary"
                  style={{ padding: '12px 24px' }}
                >
                  Create Base
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0' }}>
                ✓ Base Created!
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 20px 0' }}>
                You have {bases.length} base{bases.length !== 1 ? 's' : ''}. Now let's add some leads.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setCurrentStep('leads')}
                  className="btn-primary"
                  style={{ padding: '12px 24px' }}
                >
                  Continue to Add Leads →
                </button>
                <button
                  onClick={() => router.push('/bases')}
                  className="btn-ghost"
                  style={{ padding: '12px 24px' }}
                >
                  View All Bases
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {currentStep === 'leads' && bases.length > 0 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0' }}>
            Step 2: Add Leads to Your Base
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 20px 0' }}>
            {leadsCount === 0 
              ? 'Import leads from CSV, connect your CRM, or generate leads using AI.'
              : `You have ${leadsCount} lead${leadsCount !== 1 ? 's' : ''}. Now let's enrich and score them.`}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                const { useBaseStore } = require("@/stores/useBaseStore");
                const activeBaseId = useBaseStore.getState().activeBaseId;
                if (activeBaseId) {
                  router.push(`/bases/${activeBaseId}/leads`);
                } else {
                  router.push('/bases');
                }
              }}
              className="btn-primary"
              style={{ padding: '12px 24px' }}
            >
              {leadsCount === 0 ? 'Add Leads' : `${leadsCount} Leads Added`}
            </button>
            {leadsCount > 0 && (
              <button
                onClick={() => setCurrentStep('enrich')}
                className="btn-ghost"
                style={{ padding: '12px 24px' }}
              >
                Continue to Enrich →
              </button>
            )}
          </div>
        </div>
      )}

      {currentStep === 'enrich' && leadsCount > 0 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0' }}>
            Step 3: Enrich & Score the leads
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 20px 0' }}>
            {enrichedLeadsCount === 0
              ? 'Enrich your leads with additional data and AI-powered scoring to identify the best prospects. This helps prioritize which leads to target first.'
              : `${enrichedLeadsCount} of ${leadsCount} leads enriched and scored. Ready to create a campaign!`}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                const { useBaseStore } = require("@/stores/useBaseStore");
                const activeBaseId = useBaseStore.getState().activeBaseId;
                if (activeBaseId) {
                  router.push(`/bases/${activeBaseId}/leads`);
                } else {
                  router.push('/bases');
                }
              }}
              className="btn-primary"
              style={{ padding: '12px 24px' }}
            >
              {enrichedLeadsCount === 0 ? 'Enrich Leads' : 'View Enriched Leads'}
            </button>
            {enrichedLeadsCount > 0 && (
              <button
                onClick={() => setCurrentStep('campaign')}
                className="btn-ghost"
                style={{ padding: '12px 24px' }}
              >
                Continue to Campaign →
              </button>
            )}
          </div>
        </div>
      )}

      {currentStep === 'campaign' && enrichedLeadsCount > 0 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0' }}>
            Step 4: Create Campaign
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 20px 0' }}>
            {campaignsCount === 0
              ? 'Create your first campaign to start reaching out to your leads via email, LinkedIn, WhatsApp, or calls. Set up automated sequences and track performance.'
              : `You have ${campaignsCount} campaign${campaignsCount !== 1 ? 's' : ''}. You're all set!`}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => goToNewCampaignOrWorkspaces(router, activeBaseId)}
              className="btn-primary"
              style={{ padding: '12px 24px' }}
            >
              {campaignsCount === 0 ? 'Create Campaign' : 'Create Another Campaign'}
            </button>
          </div>
        </div>
      )}

      {/* Create Base Modal */}
      {showBaseModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowBaseModal(false)}>
          <div className="card-enhanced" style={{
            padding: '32px',
            borderRadius: '20px',
            maxWidth: '500px',
            width: '90%',
            background: 'var(--color-surface)'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 16px 0' }}>
              Create New Base
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 20px 0' }}>
              Give your base a name to organize your leads and campaigns.
            </p>
            <input
              type="text"
              className="input"
              placeholder="e.g., Q4 Outreach, Enterprise Sales"
              value={newBaseName}
              onChange={(e) => setNewBaseName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createBase()}
              style={{ width: '100%', marginBottom: '16px' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowBaseModal(false);
                  setNewBaseName('');
                }}
                className="btn-ghost"
                style={{ padding: '10px 20px' }}
              >
                Cancel
              </button>
              <button
                onClick={createBase}
                className="btn-primary"
                style={{ padding: '10px 20px' }}
                disabled={!newBaseName.trim() || loading}
              >
                {loading ? 'Creating...' : 'Create Base'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingWizard;

