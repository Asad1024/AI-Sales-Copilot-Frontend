"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { apiRequest, getUser, clearAuth, getToken } from "@/lib/apiClient";
import { useBase } from "@/context/BaseContext";
import { API_BASE } from "@/lib/api";
import { setToken, setUser } from "@/lib/apiClient";

// Icon Components
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const PlugIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);


const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const BuildingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18"></path>
    <path d="M5 21V7l8-4v18"></path>
    <path d="M19 21V11l-6-4"></path>
    <line x1="9" y1="9" x2="9" y2="9"></line>
    <line x1="9" y1="12" x2="9" y2="12"></line>
    <line x1="9" y1="15" x2="9" y2="15"></line>
    <line x1="9" y1="18" x2="9" y2="18"></line>
  </svg>
);

const MessageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

const AlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get('tab') as 'profile' | 'connectors' | 'safety' | null;
  const connectProvider = searchParams?.get('connect');
  const [tab, setTab] = useState<'profile' | 'connectors' | 'safety'>(initialTab || 'profile');

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: UserIcon },
    { id: 'connectors' as const, label: 'Connectors', icon: PlugIcon },
    { id: 'safety' as const, label: 'Safety', icon: ShieldIcon },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%)',
        borderRadius: '20px',
        padding: '32px',
        border: '1px solid rgba(76, 103, 255, 0.2)'
      }}>
        <h1 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '28px', 
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000'
          }}>
            <ShieldIcon />
          </span>
          Settings
        </h1>
        <p style={{ fontSize: '16px', color: '#888', margin: 0 }}>
          Manage your account settings, integrations, and preferences
        </p>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        flexWrap: 'wrap',
        borderBottom: '2px solid var(--elev-border)',
        paddingBottom: '16px'
      }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '12px',
              border: 'none',
              background: tab === id
                ? 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)'
                : 'transparent',
              color: tab === id ? '#000' : 'var(--color-text)',
              fontSize: '14px',
              fontWeight: tab === id ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (tab !== id) {
                e.currentTarget.style.background = 'rgba(76, 103, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (tab !== id) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card-enhanced" style={{ borderRadius: 16, padding: '32px', minHeight: '400px' }}>
        {tab === 'profile' && <ProfileSection />}
        {tab === 'connectors' && <ConnectorsSection />}
        {tab === 'safety' && <SafetySection />}
      </div>
    </div>
  );
}

function ProfileSection() {
  const user = getUser();
  const [name, setName] = useState(user?.name || '');
  const [company, setCompany] = useState(user?.company || '');
  const [timezone, setTimezone] = useState('UTC');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, company, timezone })
      });
      alert('Profile updated successfully');
      window.location.reload();
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      alert(error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <UserIcon />
          Profile Information
        </h2>
        <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
          Update your personal information and preferences
        </p>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '14px', 
            fontWeight: '600',
            color: 'var(--color-text)'
          }}>
            Full Name
          </label>
          <input
            className="input"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              border: '1px solid var(--elev-border)',
              borderRadius: '10px',
              background: 'var(--elev-bg)',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#4C67FF';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--elev-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '14px', 
            fontWeight: '600',
            color: 'var(--color-text)'
          }}>
            Company
          </label>
          <input
            className="input"
            placeholder="Company Inc."
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              border: '1px solid var(--elev-border)',
              borderRadius: '10px',
              background: 'var(--elev-bg)',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#4C67FF';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--elev-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '14px', 
            fontWeight: '600',
            color: 'var(--color-text)'
          }}>
            Timezone
          </label>
          <select
            className="input"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              border: '1px solid var(--elev-border)',
              borderRadius: '10px',
              background: 'var(--elev-bg)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#4C67FF';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--elev-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {['UTC','US/Eastern','US/Pacific','Europe/London','Asia/Dubai'].map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '10px',
              minWidth: '120px'
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              setName(user?.name || '');
              setCompany(user?.company || '');
              setTimezone('UTC');
            }}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '10px'
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

function ConnectorsSection() {
  const { activeBaseId } = useBase();
  const searchParams = useSearchParams();
  const connectProvider = searchParams?.get('connect');
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSendGridModal, setShowSendGridModal] = useState(false);
  const [showLinkedInAccountTypeModal, setShowLinkedInAccountTypeModal] = useState(false);
  const [showAirtableModal, setShowAirtableModal] = useState(false);
  const [showTwilioModal, setShowTwilioModal] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Auto-open Airtable modal if redirected from CRM import
  useEffect(() => {
    if (connectProvider === 'airtable') {
      setShowAirtableModal(true);
      // Clean URL
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/settings?tab=connectors');
      }
    }
  }, [connectProvider]);

  const loadIntegrations = useCallback(async () => {
    // Integrations are now user-level, not base-level
    // Load integrations regardless of activeBaseId
    try {
      setLoading(true);
      setAuthError(false);
      
      // Use user-level endpoint (no base_id needed)
      const data = await apiRequest(`/integrations`);
      setIntegrations(data?.integrations || []);
    } catch (error: any) {
      console.error("Failed to load integrations:", error);
      setIntegrations([]);
      
      if (error?.status === 401 || error?.message === 'Unauthorized') {
        setAuthError(true);
      }
    } finally {
      setLoading(false);
    }
  }, []); // User-level settings; no base dependency

  useEffect(() => {
    // Always load integrations (user-level settings)
    loadIntegrations();
  }, [loadIntegrations]);

  // Periodic polling to detect integrations connected directly on Unipile
  // This ensures the UI updates even when accounts are connected externally
  useEffect(() => {
    // Check if we have any Unipile integrations that might need polling
    const linkedInIntegration = integrations.find((i: any) => i.provider === "unipile_linkedin");
    const whatsAppIntegration = integrations.find((i: any) => i.provider === "unipile_whatsapp");
    
    const linkedInConnected = linkedInIntegration?.config?.account_id;
    const whatsAppConnected = whatsAppIntegration?.config?.account_id;
    
    // Only poll if we have unconnected Unipile integrations
    // If both are connected (or don't exist), no need to poll
    const needsPolling = 
      (linkedInIntegration && !linkedInConnected) || 
      (whatsAppIntegration && !whatsAppConnected);

    if (!needsPolling) {
      return; // All integrations are connected or don't exist, no need to poll
    }

    // Poll every 5 seconds to check for connection updates
    const pollInterval = setInterval(async () => {
      try {
        // Use user-level endpoint
        const data = await apiRequest(`/integrations`);
        const currentIntegrations = data?.integrations || [];
        
        // Check if any integration status changed (disconnected -> connected)
        const currentLinkedIn = currentIntegrations.find((i: any) => i.provider === "unipile_linkedin");
        const currentWhatsApp = currentIntegrations.find((i: any) => i.provider === "unipile_whatsapp");
        
        const currentLinkedInConnected = currentLinkedIn?.config?.account_id;
        const currentWhatsAppConnected = currentWhatsApp?.config?.account_id;
        
        // Debug logging
        console.log('[Settings] Polling check:', {
          prevLinkedIn: linkedInIntegration ? { id: linkedInIntegration.id, hasAccountId: !!linkedInConnected } : 'none',
          currentLinkedIn: currentLinkedIn ? { id: currentLinkedIn.id, hasAccountId: !!currentLinkedInConnected, config: currentLinkedIn.config } : 'none',
          prevWhatsApp: whatsAppIntegration ? { id: whatsAppIntegration.id, hasAccountId: !!whatsAppConnected } : 'none',
          currentWhatsApp: currentWhatsApp ? { id: currentWhatsApp.id, hasAccountId: !!currentWhatsAppConnected } : 'none'
        });
        
        // Check if connection status changed
        const linkedInJustConnected = currentLinkedInConnected && !linkedInConnected;
        const whatsAppJustConnected = currentWhatsAppConnected && !whatsAppConnected;
        
        // Also check if status changed from connected to disconnected or vice versa
        const linkedInStatusChanged = !!currentLinkedInConnected !== !!linkedInConnected;
        const whatsAppStatusChanged = !!currentWhatsAppConnected !== !!whatsAppConnected;
        
        // Update state if there are any changes
        if (linkedInJustConnected || whatsAppJustConnected || linkedInStatusChanged || whatsAppStatusChanged) {
          console.log('[Settings] Integration status changed - updating UI', {
            linkedIn: { was: linkedInConnected ? 'connected' : 'disconnected', now: currentLinkedInConnected ? 'connected' : 'disconnected' },
            whatsApp: { was: whatsAppConnected ? 'connected' : 'disconnected', now: currentWhatsAppConnected ? 'connected' : 'disconnected' }
          });
          setIntegrations(currentIntegrations);
          
          // Show notification if just connected
          if (linkedInJustConnected) {
            console.log('[Settings] LinkedIn account connected!');
          }
          if (whatsAppJustConnected) {
            console.log('[Settings] WhatsApp account connected!');
          }
        } else {
          // Also update if integrations array changed (e.g., new integration created, IDs changed)
          const prevLinkedInId = linkedInIntegration?.id;
          const prevWhatsAppId = whatsAppIntegration?.id;
          const currentLinkedInId = currentLinkedIn?.id;
          const currentWhatsAppId = currentWhatsApp?.id;
          
          const idsChanged = prevLinkedInId !== currentLinkedInId || prevWhatsAppId !== currentWhatsAppId;
          const integrationsChanged = JSON.stringify(currentIntegrations) !== JSON.stringify(integrations);
          
          if (idsChanged || integrationsChanged) {
            console.log('[Settings] Integrations array changed - updating UI', { idsChanged, integrationsChanged });
            setIntegrations(currentIntegrations);
          }
        }
      } catch (error) {
        // Silently fail - don't spam console if there's an auth error
        if (error && typeof error === 'object' && 'status' in error && error.status !== 401) {
          console.error('[Settings] Error polling integrations:', error);
        }
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [activeBaseId, integrations]);

  // Handle redirect after Unipile authentication
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const unipileSuccess = urlParams.get('unipile_success') === 'true';
    const unipileError = urlParams.get('unipile_error') === 'true';
    
    if (!unipileSuccess && !unipileError) {
      return; // No redirect params, exit early
    }
    
    // Clean URL immediately
    window.history.replaceState({}, '', '/settings');
    
    if (unipileError) {
      alert('Failed to connect account. Please try again.');
      return;
    }
    
    if (!activeBaseId) {
      alert('Please select a base first.');
      return;
    }
    
    // Poll for the integration with retries (webhook might take a moment to process)
    const pollForIntegration = async () => {
      const maxRetries = 12;
      const delayMs = 2000; // Increased delay to give webhook more time
      
      // Get initial state to detect new integrations and connection status
      let initialLinkedInExists = false;
      let initialWhatsAppExists = false;
      let initialIntegrations: any[] = [];
      try {
        // Use user-level endpoint
        const initialData = await apiRequest(`/integrations`);
        initialIntegrations = initialData?.integrations || [];
        initialLinkedInExists = initialIntegrations.some((i: any) => i.provider === "unipile_linkedin");
        initialWhatsAppExists = initialIntegrations.some((i: any) => i.provider === "unipile_whatsapp");
        
        console.log('[Settings] Initial integration state:', {
          linkedIn: { exists: initialLinkedInExists, connected: initialIntegrations.find((i: any) => i.provider === "unipile_linkedin")?.config?.account_id ? true : false },
          whatsApp: { exists: initialWhatsAppExists, connected: initialIntegrations.find((i: any) => i.provider === "unipile_whatsapp")?.config?.account_id ? true : false }
        });
      } catch (error) {
        console.error('[Settings] Error getting initial integrations:', error);
      }
      
      // Give webhook time to process before first check
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Load integrations directly from API (user-level)
          const data = await apiRequest(`/integrations`);
          const currentIntegrations = data?.integrations || [];
          
          // Check for integrations
          const linkedInIntegration = currentIntegrations.find((i: any) => i.provider === "unipile_linkedin");
          const whatsAppIntegration = currentIntegrations.find((i: any) => i.provider === "unipile_whatsapp");
          
          // Check if integration has account_id (meaning it's fully connected)
          const linkedInConnected = linkedInIntegration?.config?.account_id;
          const whatsAppConnected = whatsAppIntegration?.config?.account_id;
          
          // Check if a new integration appeared
          const newLinkedIn = linkedInIntegration && !initialLinkedInExists;
          const newWhatsApp = whatsAppIntegration && !initialWhatsAppExists;
          
          // Update state immediately to reflect current status
          setIntegrations(currentIntegrations);
          
          // If we found a new integration with account_id, success!
          if ((newLinkedIn && linkedInConnected) || (newWhatsApp && whatsAppConnected)) {
            console.log('[Settings] Integration found and connected!', { 
              linkedIn: linkedInConnected, 
              whatsApp: whatsAppConnected 
            });
            alert('Account connected successfully!');
            return; // Success, stop polling
          }
          
          // Also check if existing integration was updated (reconnection or new connection)
          // This handles the case where integration existed but didn't have account_id before
          const linkedInWasConnected = initialLinkedInExists && initialIntegrations.find((i: any) => i.provider === "unipile_linkedin")?.config?.account_id;
          const whatsAppWasConnected = initialWhatsAppExists && initialIntegrations.find((i: any) => i.provider === "unipile_whatsapp")?.config?.account_id;
          
          const linkedInJustConnected = initialLinkedInExists && linkedInConnected && !linkedInWasConnected;
          const whatsAppJustConnected = initialWhatsAppExists && whatsAppConnected && !whatsAppWasConnected;
          
          if (linkedInJustConnected || whatsAppJustConnected) {
            console.log('[Settings] Integration connected!', {
              linkedIn: linkedInJustConnected,
              whatsApp: whatsAppJustConnected
            });
            alert('Account connected successfully!');
            return; // Success, stop polling
          }
          
          // If integration exists but we're still polling, wait a bit more
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          console.error('[Settings] Error polling for integration:', error);
          // Continue polling even on error
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }
      
      // Final reload to ensure UI is up to date
      console.log('[Settings] Polling completed, doing final reload');
      await loadIntegrations();
      
      // Force a state update by checking the latest data
      try {
        // Use user-level endpoint
        const finalData = await apiRequest(`/integrations`);
        const finalIntegrations = finalData?.integrations || [];
        console.log('[Settings] Final integrations state:', finalIntegrations.map((i: any) => ({
          provider: i.provider,
          hasAccountId: !!i.config?.account_id,
          config: i.config
        })));
        setIntegrations(finalIntegrations);
      } catch (error) {
        console.error('[Settings] Error in final reload:', error);
      }
    };
    
    pollForIntegration();
  }, [loadIntegrations]); // Removed activeBaseId dependency - integrations are user-level

  const handleUnipileConnect = async (provider: 'unipile_linkedin' | 'unipile_whatsapp', linkedInAccountType?: string) => {
    if (!activeBaseId) {
      alert("Please select a base first");
      return;
    }

    try {
      // Generate auth link
      const requestBody: any = {
        base_id: activeBaseId,
        provider: provider,
        type: 'create',
      };

      // Add LinkedIn account type if provided
      if (provider === 'unipile_linkedin' && linkedInAccountType) {
        requestBody.linkedin_account_type = linkedInAccountType;
      }

      const response = await apiRequest('/integrations/unipile/auth-link', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      // Redirect user to Unipile hosted auth
      if (response.authUrl) {
        window.location.href = response.authUrl;
      } else {
        alert('Failed to generate authentication link');
      }
    } catch (error: any) {
      console.error('Failed to generate auth link:', error);
      alert(error?.message || 'Failed to generate authentication link');
    }
  };

  const sendGridIntegration = integrations.find((i) => i.provider === "sendgrid");
  const whatsappIntegration = integrations.find((i) => i.provider === "unipile_whatsapp");
  const linkedinIntegration = integrations.find((i) => i.provider === "unipile_linkedin");
  const airtableIntegration = integrations.find((i) => i.provider === "airtable");
  const twilioIntegration = integrations.find((i) => i.provider === "twilio");
  
  // For Unipile integrations, check if they have account_id (fully connected)
  const isWhatsAppConnected = whatsappIntegration?.config?.account_id ? true : false;
  const isLinkedInConnected = linkedinIntegration?.config?.account_id ? true : false;
  const isAirtableConnected = airtableIntegration?.config?.api_key ? true : false;
  const isTwilioConnected = twilioIntegration?.config?.account_sid ? true : false;

  // Note: Integrations are now user-level, but we still need activeBaseId for Unipile webhook callbacks
  // Show warning only for Unipile connections if no base is selected

  if (authError) {
    return (
      <div style={{ 
        padding: '32px', 
        background: 'rgba(239, 68, 68, 0.1)', 
        borderRadius: '12px', 
        border: '1px solid rgba(239, 68, 68, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ color: '#ef4444' }}>
            <AlertIcon />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#ef4444' }}>
            Session Expired
          </div>
        </div>
        <div style={{ fontSize: '14px', marginBottom: '20px', lineHeight: 1.6, color: 'var(--color-text)' }}>
          Your authentication token has expired (tokens are valid for 30 days). 
          You need to log in again to access this section.
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            onClick={async () => {
              clearAuth();
              try {
                if (typeof window !== 'undefined') {
                  window.location.href = '/auth/login';
                }
              } catch {}
            }}
            style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600' }}
          >
            Log In Again
          </button>
          <button
            className="btn-ghost"
            onClick={() => window.location.reload()}
            style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600' }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PlugIcon />
            Integrations & Connectors
          </h2>
          <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
            Connect external services to enhance your campaigns
          </p>
        </div>
        <button
          className="btn-ghost"
          onClick={loadIntegrations}
          disabled={loading}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '600',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="Refresh integrations status"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ 
            animation: loading ? 'spin 1s linear infinite' : 'none',
            transform: loading ? 'rotate(0deg)' : 'none'
          }}>
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '32px' }}>
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MailIcon />
            Email Providers
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <ConnectorCard
              name="SMTP"
              desc="Use your SMTP credentials"
              status="not_connected"
              icon={MailIcon}
            />
            <ConnectorCard
              name="SendGrid"
              desc="API key based sending"
              status={sendGridIntegration ? "connected" : "not_connected"}
              integration={sendGridIntegration}
              onConnect={() => setShowSendGridModal(true)}
              onDisconnect={async () => {
                if (sendGridIntegration && confirm("Are you sure you want to disconnect SendGrid?")) {
                  try {
                    await apiRequest(`/integrations/${sendGridIntegration.id}`, { method: "DELETE" });
                    await loadIntegrations();
                  } catch (error: any) {
                    alert(error?.message || "Failed to disconnect");
                  }
                }
              }}
              icon={MailIcon}
            />
          </div>
        </div>

        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BuildingIcon />
            CRMs
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <ConnectorCard name="HubSpot" desc="Import & sync contacts" status="not_connected" icon={BuildingIcon} />
            <ConnectorCard
              name="Airtable"
              desc="Import & sync contacts"
              status={isAirtableConnected ? "connected" : "not_connected"}
              integration={airtableIntegration}
              onConnect={() => setShowAirtableModal(true)}
              onDisconnect={async () => {
                if (airtableIntegration && confirm("Are you sure you want to disconnect Airtable?")) {
                  try {
                    await apiRequest(`/integrations/${airtableIntegration.id}`, { method: "DELETE" });
                    await loadIntegrations();
                  } catch (error: any) {
                    alert(error?.message || "Failed to disconnect");
                  }
                }
              }}
              icon={BuildingIcon}
            />
          </div>
        </div>

        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageIcon />
            Messaging
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <ConnectorCard
              name="WhatsApp (Twilio)"
              desc="Business API via Twilio"
              status={isWhatsAppConnected ? "connected" : "not_connected"}
              integration={whatsappIntegration}
              onConnect={() => handleUnipileConnect('unipile_whatsapp')}
              onDisconnect={async () => {
                if (whatsappIntegration && confirm("Are you sure you want to disconnect WhatsApp?")) {
                  try {
                    await apiRequest(`/integrations/${whatsappIntegration.id}`, { method: "DELETE" });
                    await loadIntegrations();
                  } catch (error: any) {
                    alert(error?.message || "Failed to disconnect");
                  }
                }
              }}
              icon={MessageIcon}
            />
            <ConnectorCard
              name="LinkedIn"
              desc="Guided outreach flows"
              status={isLinkedInConnected ? "connected" : "not_connected"}
              integration={linkedinIntegration}
              onConnect={() => setShowLinkedInAccountTypeModal(true)}
              onDisconnect={async () => {
                if (linkedinIntegration && confirm("Are you sure you want to disconnect LinkedIn?")) {
                  try {
                    await apiRequest(`/integrations/${linkedinIntegration.id}`, { method: "DELETE" });
                    await loadIntegrations();
                  } catch (error: any) {
                    alert(error?.message || "Failed to disconnect");
                  }
                }
              }}
              icon={MessageIcon}
            />
            <ConnectorCard
              name="Twilio Voice"
              desc="Call campaigns"
              status={isTwilioConnected ? "connected" : "not_connected"}
              integration={twilioIntegration}
              onConnect={() => setShowTwilioModal(true)}
              onDisconnect={async () => {
                if (twilioIntegration && confirm("Are you sure you want to disconnect Twilio?")) {
                  try {
                    await apiRequest(`/integrations/${twilioIntegration.id}`, { method: "DELETE" });
                    await loadIntegrations();
                  } catch (error: any) {
                    alert(error?.message || "Failed to disconnect");
                  }
                }
              }}
              icon={MessageIcon}
            />
          </div>
        </div>
      </div>

      {showSendGridModal && (
        <SendGridConnectionModal
          baseId={activeBaseId}
          existingIntegration={sendGridIntegration}
          onClose={() => {
            setShowSendGridModal(false);
            loadIntegrations();
          }}
        />
      )}
      {showLinkedInAccountTypeModal && (
        <LinkedInAccountTypeModal
          onClose={() => setShowLinkedInAccountTypeModal(false)}
          onContinue={(accountType) => {
            setShowLinkedInAccountTypeModal(false);
            handleUnipileConnect('unipile_linkedin', accountType);
          }}
        />
      )}
      {showAirtableModal && (
        <AirtableConnectionModal
          baseId={activeBaseId}
          existingIntegration={airtableIntegration}
          onClose={() => {
            setShowAirtableModal(false);
            loadIntegrations();
          }}
        />
      )}
      {showTwilioModal && (
        <TwilioConnectionModal
          baseId={activeBaseId}
          existingIntegration={twilioIntegration}
          onClose={() => {
            setShowTwilioModal(false);
            loadIntegrations();
          }}
        />
      )}
    </div>
  );
}

function ConnectorCard({
  name,
  desc,
  status = "not_connected",
  integration,
  onConnect,
  onDisconnect,
  icon: Icon
}: {
  name: string;
  desc: string;
  status?: "connected" | "not_connected";
  integration?: any;
  onConnect?: () => void;
  onDisconnect?: () => void;
  icon: React.ComponentType;
}) {
  return (
    <div style={{
      background: 'var(--elev-bg)',
      border: '1px solid var(--elev-border)',
      borderRadius: '16px',
      padding: '24px',
      transition: 'all 0.2s',
      position: 'relative',
      overflow: 'hidden'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.3)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 103, 255, 0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--elev-border)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: status === 'connected' 
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)'
              : 'rgba(76, 103, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: status === 'connected' ? '#10b981' : '#4C67FF'
          }}>
            <Icon />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{name}</div>
            <div style={{ fontSize: '13px', color: '#888' }}>{desc}</div>
            {integration?.config?.from_email && (
              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                {integration.config.from_email}
              </div>
            )}
            {integration?.config?.linkedin_account_type && (
              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                Account Type: {integration.config.linkedin_account_type === 'free_basic' ? 'Free / Basic' :
                  integration.config.linkedin_account_type === 'premium' ? 'Premium' :
                  integration.config.linkedin_account_type === 'sales_navigator' ? 'Sales Navigator' :
                  integration.config.linkedin_account_type === 'recruiter' ? 'Recruiter / Recruiter Lite' :
                  integration.config.linkedin_account_type}
              </div>
            )}
          </div>
        </div>
        <div style={{
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          background: status === "connected" 
            ? 'rgba(16, 185, 129, 0.15)' 
            : 'rgba(128, 128, 128, 0.15)',
          color: status === "connected" ? "#10b981" : "#888",
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {status === "connected" && <CheckIcon />}
          {status === "connected" ? "Connected" : "Not Connected"}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {status === "connected" ? (
          <>
            <button
              className="btn-ghost"
              onClick={onDisconnect}
              style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', borderRadius: '8px' }}
            >
              Disconnect
            </button>
            <button
              className="btn-ghost"
              onClick={onConnect}
              style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', borderRadius: '8px' }}
            >
              Reconnect
            </button>
          </>
        ) : (
          <button
            className="btn-primary"
            onClick={onConnect}
            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', borderRadius: '8px' }}
          >
            Connect
          </button>
        )}
        <button
          className="btn-ghost"
          style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', borderRadius: '8px' }}
        >
          Docs
        </button>
      </div>
    </div>
  );
}

function SendGridConnectionModal({
  baseId,
  existingIntegration,
  onClose
}: {
  baseId: number | null;
  existingIntegration?: any;
  onClose: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [fromEmail, setFromEmail] = useState(existingIntegration?.config?.from_email || "");
  const [fromName, setFromName] = useState(existingIntegration?.config?.from_name || "");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestStatus({ success: false, message: "Please enter an API key" });
      return;
    }

    setTesting(true);
    setTestStatus(null);
    try {
      const response = await apiRequest("/integrations/test", {
        method: "POST",
        body: JSON.stringify({
          provider: "sendgrid",
          config: { api_key: apiKey },
        }),
      });
      setTestStatus({ success: true, message: "Connection successful! Your SendGrid API key is valid." });
    } catch (error: any) {
      if (error?.status === 401) {
        setTestStatus({
          success: false,
          message: "Your session has expired. You will be redirected to login..."
        });
      } else {
        setTestStatus({
          success: false,
          message: error?.message || error?.response?.data?.error || "Connection failed. Please check your API key."
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setTestStatus({ success: false, message: "Please enter an API key" });
      return;
    }

    setSaving(true);
    setTestStatus(null);
    try {
      // base_id is now optional (for webhook reference only)
      // Integrations are user-level
      await apiRequest("/integrations", {
        method: "POST",
        body: JSON.stringify({
          ...(baseId ? { base_id: baseId } : {}), // Optional base_id
          provider: "sendgrid",
          config: {
            api_key: apiKey,
            from_email: fromEmail || undefined,
            from_name: fromName || undefined,
          },
        }),
      });
      setTestStatus({ success: true, message: "SendGrid connected successfully!" });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      if (error?.status === 401) {
        setTestStatus({
          success: false,
          message: "Your session has expired. You will be redirected to login..."
        });
      } else {
        setTestStatus({
          success: false,
          message: error?.message || error?.response?.data?.error || "Failed to connect SendGrid. Please check your API key and try again."
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className="card-enhanced"
        style={{
          borderRadius: 20,
          padding: 32,
          maxWidth: 600,
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "var(--elev-bg)",
          border: "1px solid var(--elev-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          position: "relative",
          zIndex: 1001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Connect SendGrid</h2>
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: "8px", borderRadius: '8px', fontSize: '20px', minWidth: '36px', height: '36px' }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <div style={{
            padding: '16px',
            background: 'rgba(76, 103, 255, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(76, 103, 255, 0.1)'
          }}>
            <p style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: '600', color: "var(--color-text)" }}>
              Setup Instructions:
            </p>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.8 }}>
              <li>Go to <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" style={{ color: '#4C67FF', textDecoration: 'none' }}>SendGrid Dashboard</a></li>
              <li>Click "Create API Key"</li>
              <li>Name it (e.g., "Spark AI")</li>
              <li>Select "Mail Send" permissions</li>
              <li>Copy the API key</li>
            </ol>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              API Key *
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type={showApiKey ? "text" : "password"}
                className="input"
                placeholder="SG.xxxxxxxxxxxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '1px solid var(--elev-border)',
                  borderRadius: '10px',
                  background: 'var(--elev-bg)'
                }}
              />
              <button
                className="btn-ghost"
                onClick={() => setShowApiKey(!showApiKey)}
                style={{ padding: "12px 16px", borderRadius: '10px', display: 'flex', alignItems: 'center' }}
              >
                {showApiKey ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              From Email (optional)
            </label>
            <input
              type="email"
              className="input"
              placeholder="your-email@yourdomain.com"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                border: '1px solid var(--elev-border)',
                borderRadius: '10px',
                background: 'var(--elev-bg)'
              }}
            />
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
              Default sender email for campaigns
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              From Name (optional)
            </label>
            <input
              type="text"
              className="input"
              placeholder="Your Name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                border: '1px solid var(--elev-border)',
                borderRadius: '10px',
                background: 'var(--elev-bg)'
              }}
            />
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
              Display name for email sender
            </div>
          </div>

          {testStatus && (
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: testStatus.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${testStatus.success ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                color: testStatus.success ? "#065f46" : "#991b1b",
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {testStatus.success ? <CheckIcon /> : <AlertIcon />}
              {testStatus.message}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: '8px' }}>
            <button
              className="btn-ghost"
              onClick={onClose}
              disabled={saving || testing}
              style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600', borderRadius: '10px' }}
            >
              Cancel
            </button>
            <button
              className="btn-ghost"
              onClick={handleTest}
              disabled={saving || testing || !apiKey.trim()}
              style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600', borderRadius: '10px' }}
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || testing || !apiKey.trim()}
              style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600', borderRadius: '10px' }}
            >
              {saving ? "Saving..." : existingIntegration ? "Update" : "Save & Connect"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AirtableConnectionModal({
  baseId,
  existingIntegration,
  onClose
}: {
  baseId: number | null;
  existingIntegration?: any;
  onClose: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [baseIdInput, setBaseIdInput] = useState(existingIntegration?.config?.base_id || "");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestStatus({ success: false, message: "Please enter an API key" });
      return;
    }

    setTesting(true);
    setTestStatus(null);
    try {
      const response = await apiRequest("/integrations/test", {
        method: "POST",
        body: JSON.stringify({
          provider: "airtable",
          config: { api_key: apiKey },
        }),
      });
      setTestStatus({ success: true, message: "Connection successful! Your Airtable API key is valid." });
    } catch (error: any) {
      if (error?.status === 401) {
        setTestStatus({
          success: false,
          message: "Your session has expired. You will be redirected to login..."
        });
      } else {
        setTestStatus({
          success: false,
          message: error?.message || error?.response?.data?.error || "Connection failed. Please check your API key."
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setTestStatus({ success: false, message: "Please enter an API key" });
      return;
    }

    setSaving(true);
    setTestStatus(null);
    try {
      await apiRequest("/integrations", {
        method: "POST",
        body: JSON.stringify({
          ...(baseId ? { base_id: baseId } : {}),
          provider: "airtable",
          config: {
            api_key: apiKey,
            base_id: baseIdInput || undefined,
          },
        }),
      });
      setTestStatus({ success: true, message: "Airtable connected successfully!" });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      if (error?.status === 401) {
        setTestStatus({
          success: false,
          message: "Your session has expired. You will be redirected to login..."
        });
      } else {
        setTestStatus({
          success: false,
          message: error?.message || error?.response?.data?.error || "Failed to connect Airtable. Please check your API key and try again."
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className="card-enhanced"
        style={{
          borderRadius: 20,
          padding: 32,
          maxWidth: 600,
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "var(--elev-bg)",
          border: "1px solid var(--elev-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          position: "relative",
          zIndex: 1001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Connect Airtable</h2>
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: "8px", borderRadius: '8px', fontSize: '20px', minWidth: '36px', height: '36px' }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <div style={{
            padding: '16px',
            background: 'rgba(76, 103, 255, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(76, 103, 255, 0.1)'
          }}>
            <p style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: '600', color: "var(--color-text)" }}>
              Setup Instructions:
            </p>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.8 }}>
              <li>Go to <a href="https://airtable.com/create/tokens" target="_blank" rel="noopener noreferrer" style={{ color: '#4C67FF', textDecoration: 'none' }}>Airtable Account Settings → Developer Hub</a></li>
              <li>Click "Create new token" or go to <a href="https://airtable.com/create/tokens" target="_blank" rel="noopener noreferrer" style={{ color: '#4C67FF', textDecoration: 'none' }}>airtable.com/create/tokens</a></li>
              <li>Name it (e.g., "Spark AI")</li>
              <li>Select scopes: <code>data.records:read</code> and <code>schema.bases:read</code></li>
              <li><strong>IMPORTANT:</strong> Under "Access", select the specific bases you want to import from (or "All current and future bases in all workspaces")</li>
              <li>Copy the Personal Access Token (starts with <code>pat...</code>)</li>
            </ol>
            <div style={{ marginTop: 12, padding: 12, background: 'rgba(255, 167, 38, 0.1)', borderRadius: 8, fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
              <strong>⚠️ Important:</strong> Airtable deprecated API keys. You must use a Personal Access Token (PAT). 
              <strong style={{ display: 'block', marginTop: 8 }}>Make sure to grant access to your bases</strong> when creating the token, otherwise you won't be able to see or import from them.
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              Personal Access Token *
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type={showApiKey ? "text" : "password"}
                className="input"
                placeholder="patXXXXXXXXXXXXXX"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '1px solid var(--elev-border)',
                  borderRadius: '10px',
                  background: 'var(--elev-bg)'
                }}
              />
              <button
                className="btn-ghost"
                onClick={() => setShowApiKey(!showApiKey)}
                style={{ padding: "12px 16px", borderRadius: '10px', display: 'flex', alignItems: 'center' }}
              >
                {showApiKey ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              Base ID (optional)
            </label>
            <input
              type="text"
              className="input"
              placeholder="appXXXXXXXXXXXXXX"
              value={baseIdInput}
              onChange={(e) => setBaseIdInput(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                border: '1px solid var(--elev-border)',
                borderRadius: '10px',
                background: 'var(--elev-bg)'
              }}
            />
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
              You can select the base later when importing. Leave empty if you want to choose later.
            </div>
          </div>

          {testStatus && (
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: testStatus.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${testStatus.success ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                color: testStatus.success ? "#065f46" : "#991b1b",
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {testStatus.success ? <CheckIcon /> : <AlertIcon />}
              {testStatus.message}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: '8px' }}>
            <button
              className="btn-ghost"
              onClick={onClose}
              disabled={saving || testing}
              style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600', borderRadius: '10px' }}
            >
              Cancel
            </button>
            <button
              className="btn-ghost"
              onClick={handleTest}
              disabled={saving || testing || !apiKey.trim()}
              style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600', borderRadius: '10px' }}
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || testing || !apiKey.trim()}
              style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600', borderRadius: '10px' }}
            >
              {saving ? "Saving..." : existingIntegration ? "Update" : "Save & Connect"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TwilioConnectionModal({
  baseId,
  existingIntegration,
  onClose
}: {
  baseId: number | null;
  existingIntegration?: any;
  onClose: () => void;
}) {
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(existingIntegration?.config?.phone_number || "");
  const [showAccountSid, setShowAccountSid] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  
  const hasExistingCredentials = existingIntegration?.config?.account_sid;

  const handleTest = async () => {
    if (!accountSid.trim() || !authToken.trim()) {
      setTestStatus({ success: false, message: "Please enter Account SID and Auth Token" });
      return;
    }

    setTesting(true);
    setTestStatus(null);
    try {
      const response = await apiRequest("/integrations/test", {
        method: "POST",
        body: JSON.stringify({
          provider: "twilio",
          config: {
            account_sid: accountSid,
            auth_token: authToken,
            phone_number: phoneNumber || undefined,
          },
        }),
      });
      setTestStatus({ success: true, message: "Connection successful! Your Twilio credentials are valid." });
    } catch (error: any) {
      if (error?.status === 401) {
        setTestStatus({
          success: false,
          message: "Your session has expired. You will be redirected to login..."
        });
      } else {
        setTestStatus({
          success: false,
          message: error?.message || error?.response?.data?.error || "Connection failed. Please check your credentials."
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    // If updating existing integration, allow saving with just phone number update
    // Otherwise, require Account SID and Auth Token
    if (!hasExistingCredentials && (!accountSid.trim() || !authToken.trim())) {
      setTestStatus({ success: false, message: "Please enter Account SID and Auth Token" });
      return;
    }

    // If updating existing but no new credentials provided, only update phone number
    if (hasExistingCredentials && !accountSid.trim() && !authToken.trim() && phoneNumber === existingIntegration?.config?.phone_number) {
      setTestStatus({ success: false, message: "No changes to save" });
      return;
    }

    setSaving(true);
    setTestStatus(null);
    try {
      const config: any = {};
      
      // Only include credentials if provided (for updates)
      if (accountSid.trim()) {
        config.account_sid = accountSid;
      }
      if (authToken.trim()) {
        config.auth_token = authToken;
      }
      
      // Always include phone number if provided
      if (phoneNumber.trim()) {
        config.phone_number = phoneNumber;
      }

      await apiRequest("/integrations", {
        method: "POST",
        body: JSON.stringify({
          ...(baseId ? { base_id: baseId } : {}),
          provider: "twilio",
          config,
        }),
      });
      setTestStatus({ success: true, message: hasExistingCredentials ? "Twilio updated successfully!" : "Twilio connected successfully!" });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      if (error?.status === 401) {
        setTestStatus({
          success: false,
          message: "Your session has expired. You will be redirected to login..."
        });
      } else {
        setTestStatus({
          success: false,
          message: error?.message || error?.response?.data?.error || "Failed to connect Twilio. Please check your credentials and try again."
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className="card-enhanced"
        style={{
          borderRadius: 20,
          padding: 32,
          maxWidth: 600,
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "var(--elev-bg)",
          border: "1px solid var(--elev-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          position: "relative",
          zIndex: 1001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Connect Twilio</h2>
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: "8px", borderRadius: '8px', fontSize: '20px', minWidth: '36px', height: '36px' }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          {hasExistingCredentials && (
            <div style={{
              padding: '16px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <p style={{ margin: 0, fontSize: 14, color: "#065f46", display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckIcon />
                Twilio is already connected. Enter new credentials below to update, or leave fields empty to keep existing credentials.
              </p>
            </div>
          )}
          <div style={{
            padding: '16px',
            background: 'rgba(76, 103, 255, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(76, 103, 255, 0.1)'
          }}>
            <p style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: '600', color: "var(--color-text)" }}>
              Setup Instructions:
            </p>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.8 }}>
              <li>Go to <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#4C67FF', textDecoration: 'none' }}>Twilio Console</a></li>
              <li>Navigate to Account → Account Info</li>
              <li>Copy your Account SID and Auth Token</li>
              <li>Go to Phone Numbers → Manage → Active numbers to find your Twilio phone number</li>
              <li>Paste the credentials below</li>
            </ol>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              Account SID *
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type={showAccountSid ? "text" : "password"}
                className="input"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '1px solid var(--elev-border)',
                  borderRadius: '10px',
                  background: 'var(--elev-bg)'
                }}
              />
              <button
                className="btn-ghost"
                onClick={() => setShowAccountSid(!showAccountSid)}
                style={{ padding: "12px 16px", borderRadius: '10px', display: 'flex', alignItems: 'center' }}
              >
                {showAccountSid ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              Auth Token *
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type={showAuthToken ? "text" : "password"}
                className="input"
                placeholder="Your Auth Token"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '1px solid var(--elev-border)',
                  borderRadius: '10px',
                  background: 'var(--elev-bg)'
                }}
              />
              <button
                className="btn-ghost"
                onClick={() => setShowAuthToken(!showAuthToken)}
                style={{ padding: "12px 16px", borderRadius: '10px', display: 'flex', alignItems: 'center' }}
              >
                {showAuthToken ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              Phone Number (optional)
            </label>
            <input
              type="tel"
              className="input"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                border: '1px solid var(--elev-border)',
                borderRadius: '10px',
                background: 'var(--elev-bg)'
              }}
            />
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
              Your Twilio phone number for making calls. Can be set later.
            </div>
          </div>

          {testStatus && (
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: testStatus.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${testStatus.success ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                color: testStatus.success ? "#065f46" : "#991b1b",
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {testStatus.success ? <CheckIcon /> : <AlertIcon />}
              {testStatus.message}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: '8px' }}>
            <button
              className="btn-ghost"
              onClick={onClose}
              disabled={saving || testing}
              style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600', borderRadius: '10px' }}
            >
              Cancel
            </button>
            <button
              className="btn-ghost"
              onClick={handleTest}
              disabled={saving || testing || !accountSid.trim() || !authToken.trim()}
              style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600', borderRadius: '10px' }}
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || testing || (!hasExistingCredentials && (!accountSid.trim() || !authToken.trim()))}
              style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600', borderRadius: '10px' }}
            >
              {saving ? "Saving..." : existingIntegration ? "Update" : "Save & Connect"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkedInAccountTypeModal({
  onClose,
  onContinue
}: {
  onClose: () => void;
  onContinue: (accountType: string) => void;
}) {
  const [accountType, setAccountType] = useState<string>("");

  const accountTypes = [
    { value: "free_basic", label: "Free / Basic" },
    { value: "premium", label: "Premium" },
    { value: "sales_navigator", label: "Sales Navigator" },
    { value: "recruiter", label: "Recruiter / Recruiter Lite" },
  ];

  const handleContinue = () => {
    if (!accountType) {
      alert("Please select your LinkedIn account type");
      return;
    }
    onContinue(accountType);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        className="card-enhanced"
        style={{
          width: "100%",
          maxWidth: "500px",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          position: "relative",
          zIndex: 1001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Connect LinkedIn</h2>
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: "8px", borderRadius: '8px', fontSize: '20px', minWidth: '36px', height: '36px' }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
            What type of LinkedIn account are you using? *
          </label>
          <select
            className="input"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            style={{
              width: "100%",
              padding: '12px 16px',
              fontSize: '14px',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              cursor: 'pointer'
            }}
          >
            <option value="">Select account type...</option>
            {accountTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600', borderRadius: '10px' }}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleContinue}
            disabled={!accountType}
            style={{ 
              padding: '12px 24px', 
              fontSize: '14px', 
              fontWeight: '600', 
              borderRadius: '10px',
              opacity: accountType ? 1 : 0.5,
              cursor: accountType ? 'pointer' : 'not-allowed'
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function SafetySection() {
  const [dailyCap, setDailyCap] = useState(200);
  const [quietHours, setQuietHours] = useState('20:00–09:00');
  const [stopOnReply, setStopOnReply] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sparkai:safety_settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setDailyCap(settings.dailyCap || 200);
        setQuietHours(settings.quietHours || '20:00–09:00');
        setStopOnReply(settings.stopOnReply !== false);
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = { dailyCap, quietHours, stopOnReply };
      localStorage.setItem('sparkai:safety_settings', JSON.stringify(settings));
      alert('Safety settings saved successfully');
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      alert(error?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldIcon />
          Safety Settings
        </h2>
        <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
          Configure safety limits and automation rules for your campaigns
        </p>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '14px', 
            fontWeight: '600',
            color: 'var(--color-text)'
          }}>
            Daily Send Cap (per channel)
          </label>
          <input
            type="number"
            className="input"
            value={dailyCap}
            onChange={(e) => setDailyCap(parseInt(e.target.value) || 200)}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              border: '1px solid var(--elev-border)',
              borderRadius: '10px',
              background: 'var(--elev-bg)'
            }}
          />
          <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
            Maximum number of emails that can be sent per day for each channel
          </div>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '14px', 
            fontWeight: '600',
            color: 'var(--color-text)'
          }}>
            Quiet Hours
          </label>
          <input
            className="input"
            placeholder="20:00–09:00"
            value={quietHours}
            onChange={(e) => setQuietHours(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              border: '1px solid var(--elev-border)',
              borderRadius: '10px',
              background: 'var(--elev-bg)'
            }}
          />
          <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
            Time range when campaigns will not send messages
          </div>
        </div>

        <div style={{
          padding: '20px',
          background: 'rgba(76, 103, 255, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(76, 103, 255, 0.1)'
        }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            <input
              type="checkbox"
              checked={stopOnReply}
              onChange={(e) => setStopOnReply(e.target.checked)}
              style={{
                width: '20px',
                height: '20px',
                cursor: 'pointer',
                accentColor: '#4C67FF'
              }}
            />
            <span>Stop sequence automatically on reply</span>
          </label>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '8px', marginLeft: '32px' }}>
            When enabled, follow-up messages will be paused if a lead replies
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '10px',
              minWidth: '120px'
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              setDailyCap(200);
              setQuietHours('20:00–09:00');
              setStopOnReply(true);
            }}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '10px'
            }}
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}

