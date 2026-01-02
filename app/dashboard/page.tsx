"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StatCard } from "@/components/ui/DataVisualization";
import HeroBanner from "@/components/ui/HeroBanner";
import { useBase } from "@/context/BaseContext";
import ProductTour from "@/components/ui/ProductTour";
import OnboardingWizard from "@/components/ui/OnboardingWizard";
import { apiRequest } from "@/lib/apiClient";
import { Icons } from "@/components/ui/Icons";

export default function Dashboard() {
  const router = useRouter();
  const [copilotBannerDismissed, setCopilotBannerDismissed] = useState(false);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  const { activeBaseId, bases } = useBase();
  const activeBase = bases.find(b => b.id === activeBaseId);
  
  // Fetch analytics data when base changes
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!activeBaseId) {
        setAnalyticsData(null);
        setAnalyticsLoading(false);
        return;
      }
      try {
        setAnalyticsLoading(true);
        const data = await apiRequest(`/analytics?base_id=${activeBaseId}`);
        setAnalyticsData(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        setAnalyticsData(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchAnalytics();
  }, [activeBaseId]);

  // Product Tour Steps
  const tourSteps = [
    {
      id: 'welcome',
      title: 'Welcome to Sales Co-Pilot!',
      description: 'Let\'s take a quick tour to help you get started. We\'ll show you the key features in just a few steps. You can skip anytime.',
      position: 'center' as const,
    },
    {
      id: 'goal-input',
      title: '1. Set Your Growth Goal',
      description: 'Start here! Enter what you want to achieve, like "Get 50 demos with SaaS founders in 30 days". The AI will analyze your goal and create a personalized outreach plan.',
      target: '[data-tour="goal-input"]',
      position: 'bottom' as const,
      action: () => {
        const element = document.querySelector('[data-tour="goal-input"]');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      },
    },
    {
      id: 'bases-selector',
      title: '2. Organize with Bases',
      description: 'Bases are workspaces for organizing your leads and campaigns. Create different bases for different audiences, regions, or projects.',
      target: '[data-tour="bases-selector"]',
      position: 'bottom' as const,
    },
    {
      id: 'campaigns-link',
      title: '3. View Campaigns',
      description: 'Once you create a campaign, track its performance here. See opens, replies, and conversions in real-time.',
      target: '[data-tour="campaigns-link"]',
      position: 'left' as const,
    },
    {
      id: 'leads-link',
      title: '4. Manage Leads',
      description: 'Import leads from CSV, CRM, or generate them using AI. All your leads are organized here with scoring and enrichment.',
      target: '[data-tour="leads-link"]',
      position: 'left' as const,
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Ready to grow? Enter a goal in the input field above and watch the AI create your complete outreach strategy.',
      position: 'center' as const,
    },
  ];

  const goToLeads = () => {
    if (activeBaseId) {
      router.push(`/bases/${activeBaseId}/leads`);
    } else {
      router.push('/bases');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <ProductTour steps={tourSteps} />
      <OnboardingWizard />
      <HeroBanner />
      
      {/* AI Copilot Banner - Only show when there's actionable data */}
      {activeBase && !copilotBannerDismissed && analyticsData && analyticsData.hotLeads > 0 && (
        <div style={{
          borderRadius: 12,
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.08) 0%, rgba(169, 76, 255, 0.08) 100%)',
          border: '1px solid rgba(76, 103, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icons.Sparkles size={18} style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                {analyticsData?.hotLeads || 0} Hot leads ready for outreach
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                AI suggests a LinkedIn + Email sequence for best results
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-primary ms-hover-scale ms-press"
              onClick={() => router.push('/campaigns/new')}
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              Create Campaign
            </button>
            <button
              className="btn-ghost ms-hover-scale ms-press"
              onClick={() => setCopilotBannerDismissed(true)}
              style={{ padding: '8px 12px', fontSize: 13 }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Analytics Overview */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 16,
        padding: 24,
        border: '1px solid var(--color-border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.Chart size={20} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Analytics Overview</h2>
          </div>
          <button
            className="btn-ghost ms-hover-scale ms-press"
            onClick={() => router.push('/reports')}
            style={{ padding: '6px 14px', fontSize: 13 }}
          >
            View Reports
          </button>
        </div>
        
        {analyticsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{
                background: 'var(--color-surface-secondary)',
                borderRadius: 12,
                padding: 20,
                border: '1px solid var(--color-border)'
              }}>
                <div className="loading-skeleton" style={{ height: 14, width: '60%', marginBottom: 8 }} />
                <div className="loading-skeleton" style={{ height: 28, width: '40%' }} />
              </div>
            ))}
          </div>
        ) : analyticsData ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <StatCard
                title="Total Leads"
                value={analyticsData?.totalLeads?.toLocaleString() || '0'}
                change={analyticsData?.leadChange ? `${analyticsData.leadChange > 0 ? '+' : ''}${analyticsData.leadChange.toFixed(1)}%` : undefined}
                trend={analyticsData?.leadChange > 0 ? 'up' : analyticsData?.leadChange < 0 ? 'down' : 'stable'}
                icon={<Icons.Users size={20} />}
                color="#4C67FF"
              />
              <StatCard
                title="Hot Leads"
                value={analyticsData?.hotLeads?.toString() || '0'}
                change="ready"
                trend="up"
                icon={<Icons.Flame size={20} />}
                color="#ff6b6b"
              />
              <StatCard
                title="Reply Rate"
                value={typeof analyticsData?.replyRate === 'number' ? `${analyticsData.replyRate.toFixed(1)}%` : '0%'}
                change={analyticsData?.replyChange ? `${analyticsData.replyChange > 0 ? '+' : ''}${analyticsData.replyChange.toFixed(1)} pp` : undefined}
                trend={analyticsData?.replyChange > 0 ? 'up' : analyticsData?.replyChange < 0 ? 'down' : 'stable'}
                icon={<Icons.MessageCircle size={20} />}
                color="#A94CFF"
              />
              <StatCard
                title="Conversions"
                value={analyticsData?.conversions?.toLocaleString() || '0'}
                change={analyticsData?.conversionChange ? `${analyticsData.conversionChange > 0 ? '+' : ''}${analyticsData.conversionChange.toFixed(1)}%` : undefined}
                trend={analyticsData?.conversionChange > 0 ? 'up' : analyticsData?.conversionChange < 0 ? 'down' : 'stable'}
                icon={<Icons.CheckCircle size={20} />}
                color="#4ecdc4"
              />
            </div>
            
            {/* Mini Funnel Preview */}
            {analyticsData?.funnel && analyticsData.funnel.totalLeads > 0 && (
              <div style={{ 
                marginTop: 16, 
                padding: 16, 
                background: 'var(--color-surface-secondary)', 
                borderRadius: 12,
                border: '1px solid var(--color-border)'
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--color-text-muted)' }}>
                  Conversion Funnel
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {[
                    { label: 'Leads', value: analyticsData.funnel.totalLeads, color: '#4C67FF' },
                    { label: 'Contacted', value: analyticsData.funnel.contacted, color: '#A94CFF' },
                    { label: 'Replied', value: analyticsData.funnel.replied, color: '#ffa726' },
                    { label: 'Converted', value: analyticsData.funnel.converted, color: '#4ecdc4' }
                  ].map((step, i, arr) => {
                    const prevValue = i > 0 ? arr[i - 1].value : step.value;
                    const rate = prevValue > 0 ? Math.round((step.value / prevValue) * 100) : 0;
                    return (
                      <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ 
                          height: 6, 
                          background: step.color, 
                          borderRadius: 3,
                          opacity: 0.8
                        }} />
                        <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8, color: step.color }}>
                          {step.value}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                          {step.label}
                        </div>
                        {i > 0 && (
                          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 2 }}>
                            {rate}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: 'var(--color-surface-secondary)',
            borderRadius: 12,
            border: '1px dashed var(--color-border)'
          }}>
            <Icons.Chart size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.5, marginBottom: 12 }} />
            <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 14 }}>
              Select a base from the sidebar to view analytics
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Leads Card */}
        <div
          onClick={goToLeads}
          style={{
            background: 'var(--color-surface)',
            borderRadius: 14,
            padding: 24,
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.4)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(76, 103, 255, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(76, 103, 255, 0.1)',
              border: '1px solid rgba(76, 103, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icons.Users size={22} style={{ color: '#4C67FF' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Manage Leads</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                Import, enrich & score
              </p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Add leads from CSV or AI-generate them. Enrich with contact data and score based on quality.
          </p>
        </div>

        {/* Campaigns Card */}
        <div
          onClick={() => router.push('/campaigns')}
          style={{
            background: 'var(--color-surface)',
            borderRadius: 14,
            padding: 24,
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(169, 76, 255, 0.4)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(169, 76, 255, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(169, 76, 255, 0.1)',
              border: '1px solid rgba(169, 76, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icons.Rocket size={22} style={{ color: '#A94CFF' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Campaigns</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                Multi-channel outreach
              </p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Create email, LinkedIn, and WhatsApp sequences. Track opens, replies, and conversions.
          </p>
        </div>

        {/* Bases Card */}
        <div
          onClick={() => router.push('/bases')}
          style={{
            background: 'var(--color-surface)',
            borderRadius: 14,
            padding: 24,
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icons.Folder size={22} style={{ color: '#10b981' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Workspaces</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                {bases.length} base{bases.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Organize leads and campaigns into separate workspaces for different projects or teams.
          </p>
        </div>
      </div>

      {/* Getting Started - Only show if user has no data */}
      {activeBase && analyticsData && analyticsData.totalLeads === 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.06) 0%, rgba(169, 76, 255, 0.06) 100%)',
          borderRadius: 16,
          padding: 28,
          border: '1px solid rgba(76, 103, 255, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Icons.Sparkles size={20} style={{ color: '#4C67FF' }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Get Started with "{activeBase.name}"</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[
              { step: 1, title: 'Add Leads', desc: 'Import from CSV or AI-generate', action: goToLeads, color: '#4C67FF' },
              { step: 2, title: 'Enrich Data', desc: 'Auto-fill missing contact info', action: goToLeads, color: '#A94CFF' },
              { step: 3, title: 'Launch Campaign', desc: 'Create multi-channel sequence', action: () => router.push('/campaigns/new'), color: '#10b981' }
            ].map(item => (
              <div
                key={item.step}
                onClick={item.action}
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 10,
                  padding: 16,
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = item.color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: item.color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 10
                }}>
                  {item.step}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
