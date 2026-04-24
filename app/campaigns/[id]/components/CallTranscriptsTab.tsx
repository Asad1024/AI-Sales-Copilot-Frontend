'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest, getToken } from '@/lib/apiClient';
import { API_BASE } from '@/lib/api';
import { Icons } from '@/components/ui/Icons';
import { useNotification } from '@/context/NotificationContext';

type CallStatus =
  | 'initiated'
  | 'ringing'
  | 'answered'
  | 'completed'
  | 'failed'
  | 'busy'
  | 'no_answer'
  | 'cancelled';

export interface CallLog {
  id: number;
  lead: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  } | null;
  phone_number: string;
  status: CallStatus;
  duration_seconds?: number;
  started_at?: string;
  ended_at?: string;
  transcript?: string;
  recording_url?: string;
  batch_id?: string;
  call_id?: string;
  elevenlabsConversationId?: string | null;
  createdAt: string;
  updatedAt: string;
}

type TranscriptSpeaker = 'agent' | 'user' | 'other';

type TranscriptTurn = {
  id: string;
  speaker: TranscriptSpeaker;
  label: 'Agent' | 'User' | 'Transcript';
  text: string;
};

function formatSafeDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '-'
    : d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  completed: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Completed', icon: Icons.Check },
  answered: {
    color: 'var(--color-support-blue)',
    bg: 'rgba(var(--color-support-blue-rgb), 0.2)',
    label: 'Answered',
    icon: Icons.Phone,
  },
  failed: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Failed', icon: Icons.AlertCircle },
  no_answer: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'No Answer', icon: Icons.Phone },
  busy: { color: '#fb923c', bg: 'rgba(251, 146, 60, 0.1)', label: 'Busy', icon: Icons.Phone },
  initiated: { color: 'var(--color-primary)', bg: 'rgba(242, 159, 103, 0.14)', label: 'Initiated', icon: Icons.Clock },
  ringing: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', label: 'Ringing', icon: Icons.Phone },
  cancelled: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', label: 'Cancelled', icon: Icons.X },
};

const KNOWN_STATUSES: CallStatus[] = [
  'initiated',
  'ringing',
  'answered',
  'completed',
  'failed',
  'busy',
  'no_answer',
  'cancelled',
];

const toKnownStatus = (value: unknown): CallStatus | null => {
  const normalized = String(value || '').trim().toLowerCase();
  return KNOWN_STATUSES.includes(normalized as CallStatus) ? (normalized as CallStatus) : null;
};

const toSpeaker = (raw: string): TranscriptSpeaker => {
  const role = raw.trim().toLowerCase();
  if (!role) return 'other';
  if (['agent', 'assistant', 'ai', 'bot', 'system'].includes(role)) return 'agent';
  if (['user', 'customer', 'lead', 'human', 'prospect', 'caller', 'client', 'participant'].includes(role)) return 'user';
  if (role.includes('agent') || role.includes('assistant')) return 'agent';
  if (
    role.includes('user') ||
    role.includes('customer') ||
    role.includes('lead') ||
    role.includes('client') ||
    role.includes('participant')
  ) {
    return 'user';
  }
  return 'other';
};

const speakerLabel = (speaker: TranscriptSpeaker): TranscriptTurn['label'] => {
  if (speaker === 'agent') return 'Agent';
  if (speaker === 'user') return 'User';
  return 'Transcript';
};

const parseStructuredTranscript = (value: unknown, turns: TranscriptTurn[]) => {
  if (!value || typeof value === 'string') return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === 'string') return;
      if (!item || typeof item !== 'object') return;
      const obj = item as Record<string, unknown>;
      const role = String(obj.role || obj.speaker || obj.type || '').trim();
      const rawText = String(
        obj.message || obj.text || obj.transcript || obj.content || obj.utterance || ''
      );
      const text = rawText.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
      if (!text) return;
      const speaker = toSpeaker(role);
      turns.push({
        id: `structured-${index}-${speaker}-${text.slice(0, 12)}`,
        speaker,
        label: speakerLabel(speaker),
        text,
      });
    });
    return;
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    parseStructuredTranscript(obj.messages, turns);
    parseStructuredTranscript(obj.turns, turns);
    parseStructuredTranscript(obj.dialogue, turns);
    parseStructuredTranscript(obj.transcript, turns);
    parseStructuredTranscript(obj.data, turns);
    parseStructuredTranscript(obj.conversation, turns);
  }
};

const parseTranscriptTurns = (rawTranscript: string | null | undefined): TranscriptTurn[] => {
  const transcript = String(rawTranscript || '').trim();
  if (!transcript) return [];

  if (transcript.startsWith('[') || transcript.startsWith('{')) {
    try {
      const parsed = JSON.parse(transcript);
      const structuredTurns: TranscriptTurn[] = [];
      parseStructuredTranscript(parsed, structuredTurns);
      if (structuredTurns.length > 0) return structuredTurns;
    } catch {
      // Use line-based fallback below.
    }
  }

  const lines = transcript.split(/\r?\n/);
  const turns: TranscriptTurn[] = [];
  let current: { speaker: TranscriptSpeaker; text: string } | null = null;

  const pushCurrent = () => {
    if (!current) return;
    const text = current.text.trim();
    if (!text) {
      current = null;
      return;
    }
    turns.push({
      id: `line-${turns.length}-${current.speaker}`,
      speaker: current.speaker,
      label: speakerLabel(current.speaker),
      text,
    });
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(
      /^([a-z_ ]{2,30})\s*[:\-]\s*(.+)$/i
    );
    if (match) {
      pushCurrent();
      const speaker = toSpeaker(match[1]);
      current = { speaker, text: match[2].trim() };
      continue;
    }

    if (!current) {
      current = { speaker: 'other', text: line };
    } else {
      current.text = `${current.text}\n${line}`;
    }
  }

  pushCurrent();

    if (turns.length === 0) {
      return [{ id: 'raw-0', speaker: 'other', label: 'Transcript', text: transcript }];
  }

  return turns.map((turn, idx) => ({
    ...turn,
    id: `${turn.id}-${idx}`,
    text: String(turn.text || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim(),
  })).filter((turn) => turn.text.length > 0);
};

const toApiMediaUrl = (rawUrl: string | null | undefined): string => {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE}${value.startsWith('/') ? value : `/${value}`}`;
};

export type CallTranscriptsTabPrefetchProps = {
  /** When true, parent loads call logs on campaign open; tab should reuse them instead of a duplicate GET. */
  prefetchEnabled?: boolean;
  prefetchedLogs?: CallLog[] | null;
  prefetchedLoading?: boolean;
  prefetchedError?: string | null;
  /** Workspace id — used to refresh header credits after call sync / hydration (same pool as call-minute billing). */
  baseId?: number | null;
};

function emitWorkspaceCreditsRefresh(baseId?: number | null) {
  const b = Number(baseId);
  if (typeof window === "undefined" || !Number.isFinite(b) || b <= 0) return;
  window.dispatchEvent(new CustomEvent("sparkai:workspace-credits-changed", { detail: { baseId: b } }));
}

export function CallTranscriptsTab({
  prefetchEnabled = false,
  prefetchedLogs = null,
  prefetchedLoading = false,
  prefetchedError = null,
  baseId = null,
}: CallTranscriptsTabPrefetchProps = {}) {
  const { showSuccess, showError } = useNotification();
  const params = useParams();
  const campaignId = params.id as string;

  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(() => (prefetchEnabled ? prefetchedLoading : true));
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<number>>(new Set());
  const [hydratingLogs, setHydratingLogs] = useState<Set<number>>(new Set());
  const [audioUrlsByLog, setAudioUrlsByLog] = useState<Record<number, string>>({});
  const [hydratingAudioLogs, setHydratingAudioLogs] = useState<Set<number>>(new Set());

  const hydratedConversationsRef = useRef<Set<string>>(new Set());
  const lastPrefetchedLogsDigestRef = useRef<string | null>(null);
  const audioObjectUrlsRef = useRef<Set<string>>(new Set());
  const audioUrlCacheRef = useRef<Map<string, string>>(new Map());

  const getConversationId = useCallback((log: CallLog): string => {
    return String(log.elevenlabsConversationId || log.call_id || '').trim();
  }, []);

  const updateHydratingState = (id: number, active: boolean) => {
    setHydratingLogs((prev) => {
      const next = new Set(prev);
      if (active) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const updateAudioHydratingState = (id: number, active: boolean) => {
    setHydratingAudioLogs((prev) => {
      const next = new Set(prev);
      if (active) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const ensurePlayableAudioUrl = useCallback(async (log: CallLog) => {
    const rawRecordingUrl = toApiMediaUrl(log.recording_url);
    if (!rawRecordingUrl) return;

    const alreadyLoaded = String(audioUrlsByLog[log.id] || '').trim();
    if (alreadyLoaded) return;

    const needsAuthFetch = rawRecordingUrl.startsWith(`${API_BASE}/api/`);
    if (!needsAuthFetch) {
      setAudioUrlsByLog((prev) => ({ ...prev, [log.id]: rawRecordingUrl }));
      return;
    }

    const cached = audioUrlCacheRef.current.get(rawRecordingUrl);
    if (cached) {
      setAudioUrlsByLog((prev) => ({ ...prev, [log.id]: cached }));
      return;
    }

    const token = getToken();
    if (!token) return;

    updateAudioHydratingState(log.id, true);
    try {
      const response = await fetch(rawRecordingUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch recording (${response.status})`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      audioObjectUrlsRef.current.add(objectUrl);
      audioUrlCacheRef.current.set(rawRecordingUrl, objectUrl);
      setAudioUrlsByLog((prev) => ({ ...prev, [log.id]: objectUrl }));
    } catch (audioErr) {
      console.warn('Unable to fetch protected audio recording:', audioErr);
    } finally {
      updateAudioHydratingState(log.id, false);
    }
  }, [audioUrlsByLog]);

  const hydrateCallMedia = useCallback(
    async (log: CallLog, force = false) => {
      const conversationId = getConversationId(log);
      if (!conversationId) return;
      if (!force && log.transcript && log.recording_url) return;
      if (!force && hydratedConversationsRef.current.has(conversationId)) return;

      updateHydratingState(log.id, true);
      try {
        const payload = await apiRequest(
          `/campaigns/${campaignId}/call-conversation/${encodeURIComponent(conversationId)}`
        );

        const transcript = String(payload?.transcript || '').trim();
        const recordingUrl = String(payload?.recording_url || '').trim();
        const nextStatus = toKnownStatus(payload?.status);
        const nextDuration =
          payload?.duration_seconds != null && Number.isFinite(Number(payload.duration_seconds))
            ? Number(payload.duration_seconds)
            : undefined;

        setCallLogs((prev) =>
          prev.map((item) => {
            if (item.id !== log.id) return item;
            const shouldPromoteStatus = item.status === 'initiated' || item.status === 'ringing';
            return {
              ...item,
              transcript: item.transcript || transcript || item.transcript,
              recording_url: item.recording_url || recordingUrl || item.recording_url,
              status: shouldPromoteStatus && nextStatus ? nextStatus : item.status,
              duration_seconds: item.duration_seconds || nextDuration,
            };
          })
        );

        const st = String(payload?.status || "").toLowerCase();
        const terminalLike =
          st.includes("complete") ||
          st.includes("done") ||
          (nextDuration != null && nextDuration > 0);
        if (terminalLike) {
          emitWorkspaceCreditsRefresh(baseId);
        }
      } catch (mediaErr) {
        console.warn('Failed to hydrate call media:', mediaErr);
      } finally {
        hydratedConversationsRef.current.add(conversationId);
        updateHydratingState(log.id, false);
      }
    },
    [campaignId, getConversationId, baseId]
  );

  const runHydrationForLogs = useCallback(
    (logs: CallLog[]) => {
      void Promise.all(
        logs
          .filter((log) => {
            const conversationId = getConversationId(log);
            const missingTranscript = !String(log.transcript || '').trim();
            const missingRecording = !String(log.recording_url || '').trim();
            return Boolean(conversationId) && (missingTranscript || missingRecording);
          })
          .slice(0, 20)
          .map((log) => hydrateCallMedia(log))
      );
    },
    [getConversationId, hydrateCallMedia]
  );

  const ingestCallLogs = useCallback(
    (logs: CallLog[]) => {
      hydratedConversationsRef.current = new Set();
      setCallLogs(logs);
      runHydrationForLogs(logs);
    },
    [runHydrationForLogs]
  );

  const fetchCallLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest(`/campaigns/${campaignId}/call-logs`);
      const logs: CallLog[] = data.callLogs || [];
      lastPrefetchedLogsDigestRef.current = null;
      ingestCallLogs(logs);
      emitWorkspaceCreditsRefresh(baseId);
    } catch (err: any) {
      console.error('Failed to fetch call logs:', err);
      setError(err.message || 'Failed to load call logs');
    } finally {
      setLoading(false);
    }
  }, [campaignId, ingestCallLogs, baseId]);

  useEffect(() => {
    lastPrefetchedLogsDigestRef.current = null;
  }, [campaignId]);

  useEffect(() => {
    if (!prefetchEnabled) {
      hydratedConversationsRef.current = new Set();
      void fetchCallLogs();
      return;
    }
    if (prefetchedLoading) {
      setLoading(true);
      return;
    }
    if (prefetchedError) {
      lastPrefetchedLogsDigestRef.current = null;
      hydratedConversationsRef.current = new Set();
      void fetchCallLogs();
      return;
    }
    if (prefetchedLogs !== null && prefetchedLogs !== undefined) {
      const digest = `${campaignId}:${prefetchedLogs.map((l) => l.id).join(',')}`;
      if (lastPrefetchedLogsDigestRef.current === digest) {
        setLoading(false);
        return;
      }
      lastPrefetchedLogsDigestRef.current = digest;
      ingestCallLogs(prefetchedLogs);
      setError(null);
      setLoading(false);
      return;
    }
    lastPrefetchedLogsDigestRef.current = null;
    hydratedConversationsRef.current = new Set();
    void fetchCallLogs();
  }, [
    prefetchEnabled,
    prefetchedLoading,
    prefetchedError,
    prefetchedLogs,
    campaignId,
    fetchCallLogs,
    ingestCallLogs,
  ]);

  useEffect(() => {
    callLogs.forEach((log) => {
      if (String(log.recording_url || '').trim()) {
        void ensurePlayableAudioUrl(log);
      }
    });
  }, [callLogs, ensurePlayableAudioUrl]);

  useEffect(() => {
    return () => {
      audioObjectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignore browser cleanup errors
        }
      });
      audioObjectUrlsRef.current.clear();
      audioUrlCacheRef.current.clear();
    };
  }, []);

  const syncCallStatus = async () => {
    try {
      setSyncing(true);
      setError(null);
      const result = await apiRequest(`/campaigns/${campaignId}/sync-call-status`, {
        method: 'POST',
      });
      await fetchCallLogs();

      const details =
        result.errors > 0
          ? [`Synced ${result.synced} calls.`, `${result.errors} errors occurred.`]
          : [`Synced ${result.synced} calls.`];
      showSuccess('Call sync complete', '', { details });
    } catch (err: any) {
      console.error('Failed to sync call status:', err);
      setError(err.message || 'Failed to sync call status');
      showError('Sync failed', err?.message || 'Failed to sync call status');
    } finally {
      setSyncing(false);
    }
  };

  const toggleTranscript = (callId: number) => {
    const targetLog = callLogs.find((item) => item.id === callId);
    const shouldExpand = !expandedTranscripts.has(callId);

    setExpandedTranscripts((prev) => {
      const next = new Set(prev);
      if (next.has(callId)) next.delete(callId);
      else next.add(callId);
      return next;
    });

    if (shouldExpand && targetLog) {
      void hydrateCallMedia(targetLog, true);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isAnsweredLike = (status: CallStatus) => status === 'answered' || status === 'completed';

  const filteredCallLogs =
    filter === 'all'
      ? callLogs
      : filter === 'answered'
        ? callLogs.filter((log) => isAnsweredLike(log.status))
        : callLogs.filter((log) => log.status === filter);

  const stats = {
    total: callLogs.length,
    completed: callLogs.filter((l) => l.status === 'completed').length,
    answered: callLogs.filter((l) => isAnsweredLike(l.status)).length,
    failed: callLogs.filter((l) => l.status === 'failed').length,
    no_answer: callLogs.filter((l) => l.status === 'no_answer').length,
    with_transcript: callLogs.filter((l) => String(l.transcript || '').trim().length > 0).length,
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
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
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
            transition: 'all 0.2s',
          }}
        >
          <Icons.RefreshCw size={16} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Syncing...' : 'Sync Status'}
        </button>
      </div>

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
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-support-blue)' }}>{stats.answered}</div>
        </div>
        <div style={{ padding: 16, background: 'var(--elev-bg)', borderRadius: 12, border: '1px solid var(--elev-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>With Transcript</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6' }}>{stats.with_transcript}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid var(--color-border)', paddingBottom: 0 }}>
        {[
          { value: 'all', label: 'All Calls', count: stats.total },
          { value: 'completed', label: 'Completed', count: stats.completed },
          { value: 'answered', label: 'Answered', count: stats.answered },
          { value: 'failed', label: 'Failed', count: stats.failed },
          { value: 'no_answer', label: 'No Answer', count: stats.no_answer },
        ].map((tab) => (
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
              transition: 'all 0.2s',
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {filteredCallLogs.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: 'center',
            background: 'rgba(242, 159, 103, 0.08)',
            borderRadius: 12,
            border: '1px dashed rgba(242, 159, 103, 0.35)',
          }}
        >
          <Icons.Phone size={48} style={{ color: 'var(--color-primary)', opacity: 0.5 }} />
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>No call logs yet</div>
          <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
            {filter === 'all' ? 'Call logs will appear here once calls are initiated' : `No ${filter.replace('_', ' ')} calls found`}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredCallLogs.map((log) => {
            const statusInfo = statusConfig[log.status] || statusConfig.initiated;
            const StatusIcon = statusInfo.icon;
            const isExpanded = expandedTranscripts.has(log.id);
            const isHydrating = hydratingLogs.has(log.id);
            const conversationId = getConversationId(log);
            const transcriptTurns = parseTranscriptTurns(log.transcript);
            const hasTranscript = transcriptTurns.length > 0;
            const hasConversationData = Boolean(hasTranscript || conversationId);
            const durationLabel = formatDuration(log.duration_seconds);
            const recordingSrc = String(audioUrlsByLog[log.id] || '').trim();
            const isAudioHydrating = hydratingAudioLogs.has(log.id);

            return (
              <div
                key={log.id}
                style={{
                  background: 'var(--elev-bg)',
                  borderRadius: 12,
                  padding: 20,
                  border: '1px solid var(--elev-border)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <Icons.User size={18} style={{ color: 'var(--color-primary)' }} />
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{log.lead?.name || 'Unknown Lead'}</div>
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
                          gap: 6,
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
                    {durationLabel ? (
                      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>
                        {durationLabel}
                      </div>
                    ) : null}
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {log.started_at
                        ? new Date(log.started_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : 'Not started'}
                    </div>
                  </div>
                </div>

                {hasConversationData && (
                  <div style={{ marginBottom: 16 }}>
                    <button
                      onClick={() => toggleTranscript(log.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(242, 159, 103, 0.08)',
                        border: '1px solid rgba(242, 159, 103, 0.28)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--color-primary)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Icons.FileText size={16} />
                      {isExpanded ? 'Hide Transcript' : 'View Transcript'}
                      <Icons.ChevronDown
                        size={16}
                        style={{
                          marginLeft: 'auto',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
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
                          border: '1px solid var(--color-border)',
                          maxHeight: 420,
                          overflow: 'auto',
                          display: 'grid',
                          gap: 10,
                        }}
                      >
                        {isHydrating && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: 13 }}>
                            <Icons.Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            Fetching latest voice transcript...
                          </div>
                        )}

                        {hasTranscript ? (
                          transcriptTurns.map((turn) => {
                            const isUser = turn.speaker === 'user';
                            const isAgent = turn.speaker === 'agent';
                            const align = isUser ? 'flex-end' : 'flex-start';
                            const bubbleBg = isUser
                              ? 'rgba(242, 159, 103, 0.15)'
                              : isAgent
                                ? 'rgba(var(--color-support-blue-rgb), 0.10)'
                                : 'rgba(148, 163, 184, 0.14)';
                            const bubbleBorder = isUser
                              ? 'rgba(242, 159, 103, 0.45)'
                              : isAgent
                                ? 'rgba(var(--color-support-blue-rgb), 0.35)'
                                : 'rgba(148, 163, 184, 0.35)';
                            const labelBg = isUser
                              ? 'rgba(242, 159, 103, 0.2)'
                              : isAgent
                                ? 'rgba(var(--color-support-blue-rgb), 0.2)'
                                : 'rgba(148, 163, 184, 0.2)';
                            const labelColor = isUser
                              ? '#de8850'
                              : isAgent
                                ? 'var(--color-support-blue)'
                                : 'var(--color-text-muted)';

                            return (
                              <div key={turn.id} style={{ display: 'flex', justifyContent: align }}>
                                <div
                                  style={{
                                    width: 'fit-content',
                                    maxWidth: '78%',
                                    borderRadius: 12,
                                    border: `1px solid ${bubbleBorder}`,
                                    background: bubbleBg,
                                    padding: '10px 12px',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      borderRadius: 999,
                                      padding: '3px 10px',
                                      background: labelBg,
                                      color: labelColor,
                                      fontWeight: 700,
                                      fontSize: 11,
                                      textTransform: 'uppercase',
                                      marginBottom: 8,
                                      letterSpacing: '0.05em',
                                    }}
                                  >
                                    {isUser ? <Icons.User size={12} /> : isAgent ? <Icons.Robot size={12} /> : <Icons.FileText size={12} />}
                                    {turn.label}
                                  </div>
                                  <div
                                    style={{
                                      whiteSpace: 'pre-wrap',
                                      lineHeight: 1.5,
                                      color: 'var(--color-text)',
                                      wordBreak: 'break-word',
                                      overflowWrap: 'anywhere',
                                    }}
                                  >
                                    {turn.text}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                            Transcript not available yet for this conversation.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(log.recording_url || conversationId) && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                      <Icons.Play size={14} />
                      Voice Recording
                    </div>
                    {recordingSrc ? (
                      <audio controls src={recordingSrc} style={{ width: '100%', height: 40, borderRadius: 8 }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: 13 }}>
                        {isHydrating || isAudioHydrating ? (
                          <>
                            <Icons.Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            Fetching recording...
                          </>
                        ) : (
                          <>
                            <Icons.AlertCircle size={14} />
                            Recording not available yet.
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    paddingTop: 12,
                    borderTop: '1px solid var(--color-border)',
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <div>Created: {formatSafeDate(log.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
