'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/apiClient';
import { Icons } from '@/components/ui/Icons';
import { useNotification } from '@/context/NotificationContext';

interface CallLog {
  id: number;
  lead: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  } | null;
  phone_number: string;
  status: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no_answer' | 'cancelled';
  duration_seconds?: number;
  started_at?: string;
  ended_at?: string;
  transcript?: string;
  recording_url?: string;
  batch_id?: string;
  call_id?: string;
  /** Voice provider conversation id (same as call_id). */
  elevenlabsConversationId?: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatSafeDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  completed: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Completed', icon: Icons.Check },
  answered: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Answered', icon: Icons.Phone },
  failed: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Failed', icon: Icons.AlertCircle },
  no_answer: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'No Answer', icon: Icons.Phone },
  busy: { color: '#fb923c', bg: 'rgba(251, 146, 60, 0.1)', label: 'Busy', icon: Icons.Phone },
  initiated: { color: 'var(--color-primary)', bg: 'rgba(99, 102, 241, 0.1)', label: 'Initiated', icon: Icons.Clock },
  ringing: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', label: 'Ringing', icon: Icons.Phone },
  cancelled: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', label: 'Cancelled', icon: Icons.X }
};

export function CallTranscriptsTab() {
  const { showSuccess, showError } = useNotification();
  const params = useParams();
  const campaignId = params.id as string;
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchCallLogs();
  }, [campaignId]);

  const fetchCallLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest(`/campaigns/${campaignId}/call-logs`);
      setCallLogs(data.callLogs || []);
    } catch (err: any) {
      console.error('Failed to fetch call logs:', err);
      setError(err.message || 'Failed to load call logs');
    } finally {
      setLoading(false);
    }
  };

  const syncCallStatus = async () => {
    try {
      setSyncing(true);
      setError(null);
      const result = await apiRequest(`/campaigns/${campaignId}/sync-call-status`, {
        method: 'POST'
      });
      console.log(`[Call Sync] Synced ${result.synced} calls`);
      
      // Refresh call logs after sync
      await fetchCallLogs();
      
      const details =
        result.errors > 0
          ? [`Synced ${result.synced} calls.`, `${result.errors} errors occurred.`]
          : [`Synced ${result.synced} calls.`];
      showSuccess("Call sync complete", "", { details });
    } catch (err: any) {
      console.error('Failed to sync call status:', err);
      setError(err.message || 'Failed to sync call status');
      showError('Sync failed', err?.message || 'Failed to sync call status');
    } finally {
      setSyncing(false);
    }
  };

  const toggleTranscript = (callId: number) => {
    setExpandedTranscripts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(callId)) {
        newSet.delete(callId);
      } else {
        newSet.add(callId);
      }
      return newSet;
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredCallLogs = filter === 'all' 
    ? callLogs 
    : callLogs.filter(log => log.status === filter);

  const stats = {
    total: callLogs.length,
    completed: callLogs.filter(l => l.status === 'completed').length,
    answered: callLogs.filter(l => l.status === 'answered').length,
    failed: callLogs.filter(l => l.status === 'failed').length,
    no_answer: callLogs.filter(l => l.status === 'no_answer').length,
    with_transcript: callLogs.filter(l => l.transcript).length
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Icons.Loader size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
        <div style={{ marginTop: 16, fontSize: 16, color: 'var(--color-text-muted)' }}>Loading call logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Icons.AlertCircle size={40} style={{ color: '#ef4444' }} />
        <div style={{ marginTop: 16, fontSize: 16, color: '#ef4444' }}>Error: {error}</div>
        <button 
          onClick={fetchCallLogs}
          style={{ 
            marginTop: 20, 
            padding: '12px 24px', 
            background: 'var(--color-primary)', 
            color: 'white', 
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.Phone size={20} style={{ color: 'var(--color-primary)' }} />
            Call Transcripts & Recordings ({filteredCallLogs.length})
          </h3>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
            View detailed call logs with transcripts and recordings from your voice provider
          </p>
        </div>
        <button
          onClick={syncCallStatus}
          disabled={syncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px',
            background: syncing ? '#9ca3af' : 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: syncing ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
        >
          <Icons.RefreshCw size={16} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Syncing...' : 'Sync Status'}
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, background: 'var(--elev-bg)', borderRadius: 12, border: '1px solid var(--elev-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Total Calls</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' }}>{stats.total}</div>
        </div>
        <div style={{ padding: 16, background: 'var(--elev-bg)', borderRadius: 12, border: '1px solid var(--elev-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Completed</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{stats.completed}</div>
        </div>
        <div style={{ padding: 16, background: 'var(--elev-bg)', borderRadius: 12, border: '1px solid var(--elev-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Answered</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{stats.answered}</div>
        </div>
        <div style={{ padding: 16, background: 'var(--elev-bg)', borderRadius: 12, border: '1px solid var(--elev-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>With Transcript</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6' }}>{stats.with_transcript}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid var(--color-border)', paddingBottom: 0 }}>
        {[
          { value: 'all', label: 'All Calls', count: stats.total },
          { value: 'completed', label: 'Completed', count: stats.completed },
          { value: 'answered', label: 'Answered', count: stats.answered },
          { value: 'failed', label: 'Failed', count: stats.failed },
          { value: 'no_answer', label: 'No Answer', count: stats.no_answer }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: filter === tab.value ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: filter === tab.value ? 'var(--color-primary)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: -2,
              transition: 'all 0.2s'
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Call Logs List */}
      {filteredCallLogs.length === 0 ? (
        <div style={{ 
          padding: 60, 
          textAlign: 'center',
          background: 'rgba(99, 102, 241, 0.05)',
          borderRadius: 12,
          border: '1px dashed rgba(99, 102, 241, 0.3)'
        }}>
          <Icons.Phone size={48} style={{ color: 'var(--color-primary)', opacity: 0.5 }} />
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>No call logs yet</div>
          <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
            {filter === 'all' 
              ? 'Call logs will appear here once calls are initiated'
              : `No ${filter.replace('_', ' ')} calls found`
            }
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredCallLogs.map(log => {
            const statusInfo = statusConfig[log.status] || statusConfig.initiated;
            const StatusIcon = statusInfo.icon;
            const isExpanded = expandedTranscripts.has(log.id);

            return (
              <div 
                key={log.id} 
                style={{ 
                  background: 'var(--elev-bg)', 
                  borderRadius: 12, 
                  padding: 20,
                  border: '1px solid var(--elev-border)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <Icons.User size={18} style={{ color: 'var(--color-primary)' }} />
                      <div style={{ fontWeight: 600, fontSize: 16 }}>
                        {log.lead?.name || 'Unknown Lead'}
                      </div>
                      <div 
                        style={{ 
                          padding: '4px 12px', 
                          borderRadius: 6, 
                          background: statusInfo.bg,
                          color: statusInfo.color,
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <StatusIcon size={14} />
                        {statusInfo.label}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icons.Phone size={14} />
                        {log.phone_number}
                      </div>
                      {log.lead?.company && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icons.Briefcase size={14} />
                          {log.lead.company}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>
                      {formatDuration(log.duration_seconds)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {log.started_at ? new Date(log.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'Not started'}
                    </div>
                  </div>
                </div>

                {/* Transcript */}
                {log.transcript && (
                  <div style={{ marginBottom: 16 }}>
                    <button
                      onClick={() => toggleTranscript(log.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(99, 102, 241, 0.05)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--color-primary)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Icons.FileText size={16} />
                      {isExpanded ? 'Hide Transcript' : 'View Transcript'}
                      <Icons.ChevronDown 
                        size={16} 
                        style={{ 
                          marginLeft: 'auto',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }} 
                      />
                    </button>
                    
                    {isExpanded && (
                      <div 
                        style={{ 
                          marginTop: 12,
                          background: 'var(--color-background)', 
                          padding: 16, 
                          borderRadius: 8, 
                          fontSize: 14, 
                          lineHeight: 1.8,
                          whiteSpace: 'pre-wrap',
                          border: '1px solid var(--color-border)',
                          maxHeight: 400,
                          overflow: 'auto'
                        }}
                      >
                        {log.transcript}
                      </div>
                    )}
                  </div>
                )}

                {/* Recording */}
                {log.recording_url && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                      <Icons.Play size={14} />
                      Call Recording
                    </div>
                    <audio 
                      controls 
                      src={log.recording_url} 
                      style={{ 
                        width: '100%', 
                        height: 40,
                        borderRadius: 8
                      }} 
                    />
                  </div>
                )}

                {/* Footer */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  paddingTop: 12, 
                  borderTop: '1px solid var(--color-border)',
                  fontSize: 12,
                  color: 'var(--color-text-muted)'
                }}>
                  <div>
                    {(log.elevenlabsConversationId || log.call_id) && (
                      <div>
                        Conversation ID: {(log.elevenlabsConversationId || log.call_id || "").slice(0, 20)}
                        {(log.elevenlabsConversationId || log.call_id || "").length > 20 ? "…" : ""}
                      </div>
                    )}
                  </div>
                  <div>
                    Created: {formatSafeDate(log.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
