"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/apiClient";
import { Icons } from "@/components/ui/Icons";
import { CRMLogos } from "@/components/ui/CRMLogos";
import { useNotification } from "@/context/NotificationContext";

type Props = { 
  open: boolean; 
  onClose: () => void; 
  onImported: (rows: any[]) => void;
  onOpenAirtableImport?: () => void;
  targetBaseId?: number;
};

const CRM_PROVIDERS = [
  { name: 'HubSpot', Logo: CRMLogos.HubSpot, provider: 'hubspot', description: 'Import contacts and deals from HubSpot CRM' },
  { name: 'Salesforce', Logo: CRMLogos.Salesforce, provider: 'salesforce', description: 'Connect with Salesforce for advanced CRM features' },
  { name: 'Pipedrive', Logo: CRMLogos.Pipedrive, provider: 'pipedrive', description: 'Import leads and deals from Pipedrive' },
  { name: 'Zoho CRM', Logo: CRMLogos.Zoho, provider: 'zoho', description: 'Sync contacts and leads from Zoho CRM' },
  { name: 'Airtable', Logo: CRMLogos.Airtable, provider: 'airtable', description: 'Import records from Airtable bases and tables' }
];

export default function CRMImportModal({ open, onClose, onImported, onOpenAirtableImport, targetBaseId }: Props) {
  const router = useRouter();
  const { showInfo } = useNotification();
  const [provider, setProvider] = useState('Airtable');
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (open) {
      loadIntegrations();
    }
  }, [open]);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/integrations');
      setIntegrations(data?.integrations || []);
    } catch (error) {
      console.error('Failed to load integrations:', error);
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationStatus = (providerName: string) => {
    const providerInfo = CRM_PROVIDERS.find(p => p.name === providerName);
    if (!providerInfo) return 'not_connected';
    
    const integration = integrations.find((i: any) => i.provider === providerInfo.provider);
    
    if (providerName === 'Airtable') {
      return integration?.config?.api_key ? 'connected' : 'not_connected';
    }
    
    // For other providers, check if they have connection data
    return integration ? 'connected' : 'not_connected';
  };

  const handleProviderClick = (providerName: string) => {
    const status = getIntegrationStatus(providerName);
    
    if (providerName === 'Airtable') {
      if (status === 'connected') {
        // If Airtable is connected, open the import modal directly
        onClose();
        if (onOpenAirtableImport) {
          onOpenAirtableImport();
        }
      } else {
        // Redirect to settings page to connect Airtable
        onClose();
        router.push('/settings?tab=connectors&connect=airtable');
      }
    } else {
      // For other providers, show coming soon or redirect to settings
      setProvider(providerName);
      if (status === 'not_connected') {
        onClose();
        router.push('/settings?tab=connectors');
      } else {
        showInfo("Coming soon", `${providerName} integration is coming soon.`);
      }
    }
  };
  
  if (!open) return null;
  
  const selectedProvider = CRM_PROVIDERS.find(p => p.name === provider);
  
  return (
    <div 
      style={{ 
        position:'fixed', 
        inset:0, 
        background:'rgba(0,0,0,.6)', 
        backdropFilter: 'blur(4px)',
        zIndex:1000, 
        display:'flex', 
        alignItems:'center', 
        justifyContent:'center', 
        padding:20 
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ 
        width:'min(700px, 96vw)', 
        maxWidth: '96vw',
        background:'var(--elev-bg)', 
        border:'1px solid var(--elev-border)', 
        borderRadius:16, 
        padding:24,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h3 style={{ margin:0, fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              🔗 Import from CRM
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
              Connect your CRM to import leads and contacts
            </p>
          </div>
          <button 
            className="btn-ghost" 
            onClick={onClose}
            style={{ 
              padding: '8px 12px',
              fontSize: 14,
              minWidth: 'auto'
            }}
          >
            ✕
          </button>
        </div>

        {/* Provider Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
            Select CRM Provider
          </label>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Icons.Loader size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading integrations...</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                {CRM_PROVIDERS.map(p => {
                  const status = getIntegrationStatus(p.name);
                  const isConnected = status === 'connected';
                  
                  const LogoComponent = p.Logo;
                  return (
                    <button
                      key={p.name}
                      onClick={() => handleProviderClick(p.name)}
                      style={{
                        padding: '16px 12px',
                        background: isConnected
                          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
                          : provider === p.name 
                            ? 'linear-gradient(135deg, rgba(76, 103, 255, 0.15) 0%, rgba(169, 76, 255, 0.15) 100%)' 
                            : 'var(--color-surface)',
                        border: isConnected
                          ? '2px solid #10b981'
                          : provider === p.name 
                            ? '2px solid #4C67FF' 
                            : '1px solid var(--color-border)',
                        borderRadius: 12,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        if (provider !== p.name && !isConnected) {
                          e.currentTarget.style.background = 'var(--color-surface-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (provider !== p.name && !isConnected) {
                          e.currentTarget.style.background = 'var(--color-surface)';
                        }
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        width: 40,
                        height: 40
                      }}>
                        <LogoComponent size={32} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                      {isConnected && (
                        <div style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#10b981',
                          border: '2px solid var(--elev-bg)'
                        }} />
                      )}
                      {isConnected && (
                        <div style={{
                          fontSize: 11,
                          color: '#10b981',
                          fontWeight: 600,
                          marginTop: -4
                        }}>
                          Connected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 16, padding: 12, background: 'rgba(76, 103, 255, 0.05)', borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                  <strong>Connected platforms:</strong> Click to import directly. <strong>Not connected:</strong> Click to connect in Settings.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Info Message */}
        <div style={{ 
          padding: 16, 
          background: 'rgba(76, 103, 255, 0.1)', 
          borderRadius: 12, 
          marginBottom: 20,
          border: '1px solid rgba(76, 103, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Icons.Info size={20} style={{ color: '#4C67FF', flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                How it works
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Click on a connected platform to import leads directly. For platforms that aren't connected yet, 
                click to go to Settings where you can connect them. Once connected, come back here to import.
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button 
            className="btn-ghost" 
            onClick={onClose}
            style={{ padding: '10px 20px', fontSize: 14 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


