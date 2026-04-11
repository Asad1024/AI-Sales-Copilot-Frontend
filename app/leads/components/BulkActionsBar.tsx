"use client";
import { useState, useRef, useEffect } from "react";
import { useLeadStore } from "@/stores/useLeadStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { apiRequest } from "@/lib/apiClient";

interface BulkActionsBarProps {
  onBulkDelete: (ids: number[]) => Promise<void>;
  onBulkUpdate: (ids: number[], updates: any) => Promise<void>;
  deleting?: boolean;
  bulkUpdating?: boolean;
}

export function BulkActionsBar({ onBulkDelete, onBulkUpdate, deleting = false, bulkUpdating = false }: BulkActionsBarProps) {
  const { selectedLeads, setSelectedLeads } = useLeadStore();
  const { activeBaseId } = useBaseStore();
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'tag' | 'assign' | 'update' | null>(null);
  const [bulkTagValue, setBulkTagValue] = useState('');
  const [bulkUpdateField, setBulkUpdateField] = useState<'tier' | 'score' | 'industry' | 'region'>('tier');
  const [bulkUpdateValue, setBulkUpdateValue] = useState('');
  const [bulkOwnerId, setBulkOwnerId] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const bulkActionsRef = useRef<HTMLDivElement>(null);

  // Fetch team members when base changes
  useEffect(() => {
    const fetchMembers = async () => {
      if (!activeBaseId) {
        setTeamMembers([]);
        return;
      }
      setLoadingMembers(true);
      try {
        const data = await apiRequest(`/bases/${activeBaseId}/members`);
        const members = Array.isArray(data?.members) ? data.members : [];
        setTeamMembers(members.map((m: any) => ({
          id: m.user?.id || m.User?.id,
          name: m.user?.name || m.User?.name || m.user?.email || m.User?.email,
          email: m.user?.email || m.User?.email
        })).filter((m: any) => m.id));
      } catch (error) {
        console.error('Failed to fetch team members:', error);
        setTeamMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, [activeBaseId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target as Node)) {
        setShowBulkActions(false);
        setBulkActionType(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBulkUpdate = async () => {
    if (selectedLeads.length === 0) return;
    
    if (bulkActionType === 'tag' && bulkTagValue.trim()) {
      await onBulkUpdate(selectedLeads, { tags: { [bulkTagValue]: true } });
      setBulkTagValue('');
      setBulkActionType(null);
      setShowBulkActions(false);
    } else if (bulkActionType === 'assign') {
      // Allow null to unassign
      await onBulkUpdate(selectedLeads, { owner_id: bulkOwnerId ?? null });
      setBulkOwnerId(null);
      setBulkActionType(null);
      setShowBulkActions(false);
    } else if (bulkActionType === 'update' && bulkUpdateValue.trim()) {
      const updates: any = {};
      if (bulkUpdateField === 'score') {
        updates.score = Number(bulkUpdateValue);
      } else {
        updates[bulkUpdateField] = bulkUpdateValue;
      }
      await onBulkUpdate(selectedLeads, updates);
      setBulkUpdateValue('');
      setBulkActionType(null);
      setShowBulkActions(false);
    }
  };

  if (selectedLeads.length === 0) return null;

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 8,
      padding: '6px 12px',
      background: 'rgba(124, 58, 237, 0.1)',
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      color: '#7C3AED',
      position: 'relative'
    }}>
      <span>{selectedLeads.length} selected</span>
      <button
        onClick={() => {
          setShowBulkActions(true);
          setBulkActionType('update');
        }}
        disabled={bulkUpdating}
        style={{
          padding: '4px 12px',
          background: 'rgba(124, 58, 237, 0.2)',
          border: '1px solid rgba(124, 58, 237, 0.5)',
          borderRadius: 6,
          color: '#7C3AED',
          fontSize: 12,
          fontWeight: 600,
          cursor: bulkUpdating ? 'not-allowed' : 'pointer',
          opacity: bulkUpdating ? 0.6 : 1
        }}
      >
        ✏️ Update
      </button>
      <button
        onClick={() => onBulkDelete(selectedLeads)}
        disabled={deleting}
        style={{
          padding: '4px 12px',
          background: 'rgba(255, 107, 107, 0.2)',
          border: '1px solid rgba(255, 107, 107, 0.5)',
          borderRadius: 6,
          color: '#ff6b6b',
          fontSize: 12,
          fontWeight: 600,
          cursor: deleting ? 'not-allowed' : 'pointer',
          opacity: deleting ? 0.6 : 1
        }}
      >
        {deleting ? '⏳ Deleting...' : '🗑️ Delete'}
      </button>
      <button
        onClick={() => setSelectedLeads([])}
        style={{
          padding: '4px 12px',
          background: 'transparent',
          border: '1px solid var(--color-border)',
          borderRadius: 6,
          color: 'var(--color-text)',
          fontSize: 12,
          cursor: 'pointer'
        }}
      >
        Clear
      </button>
      
      {showBulkActions && (
        <div ref={bulkActionsRef} style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 8,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: 16,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          zIndex: 1000,
          minWidth: 300
        }}>
          <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Bulk Actions</div>
          
          {!bulkActionType ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => setBulkActionType('assign')}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(124, 58, 237, 0.1)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: 8,
                  color: '#7C3AED',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                👤 Assign Owner
              </button>
              <button
                onClick={() => setBulkActionType('tag')}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(124, 58, 237, 0.1)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: 8,
                  color: '#7C3AED',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                🏷️ Add Tag
              </button>
              <button
                onClick={() => setBulkActionType('update')}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(124, 58, 237, 0.1)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: 8,
                  color: '#7C3AED',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                ✏️ Update Field
              </button>
            </div>
          ) : bulkActionType === 'assign' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loadingMembers ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Loading team members...
                </div>
              ) : teamMembers.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                  No team members found. Add members in Team settings.
                </div>
              ) : (
                <>
                  <select
                    value={bulkOwnerId || ''}
                    onChange={(e) => setBulkOwnerId(e.target.value ? parseInt(e.target.value) : null)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface-secondary)',
                      color: 'var(--color-text)',
                      fontSize: 13
                    }}
                  >
                    <option value="">Unassign (remove owner)</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleBulkUpdate}
                      disabled={bulkUpdating}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#000000',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: bulkUpdating ? 'not-allowed' : 'pointer',
                        opacity: bulkUpdating ? 0.6 : 1,
                        flex: 1
                      }}
                    >
                      {bulkUpdating 
                        ? '⏳ Processing...' 
                        : bulkOwnerId === null 
                          ? 'Unassign All' 
                          : `Assign to ${teamMembers.find(m => m.id === bulkOwnerId)?.name || 'Selected'}`}
                    </button>
                    <button
                      onClick={() => {
                        setBulkActionType(null);
                        setBulkOwnerId(null);
                      }}
                      style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        color: 'var(--color-text)',
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : bulkActionType === 'tag' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                placeholder="Enter tag name"
                value={bulkTagValue}
                onChange={(e) => setBulkTagValue(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-secondary)',
                  color: 'var(--color-text)',
                  fontSize: 13
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleBulkUpdate}
                  disabled={bulkUpdating || !bulkTagValue.trim()}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#000000',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: (bulkUpdating || !bulkTagValue.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (bulkUpdating || !bulkTagValue.trim()) ? 0.6 : 1,
                    flex: 1
                  }}
                >
                  {bulkUpdating ? '⏳...' : 'Apply'}
                </button>
                <button
                  onClick={() => {
                    setBulkActionType(null);
                    setBulkTagValue('');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    color: 'var(--color-text)',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select
                value={bulkUpdateField}
                onChange={(e) => setBulkUpdateField(e.target.value as any)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-secondary)',
                  color: 'var(--color-text)',
                  fontSize: 13
                }}
              >
                <option value="tier">Tier (Hot/Warm/Cold)</option>
                <option value="score">Score (0-100)</option>
                <option value="industry">Industry</option>
                <option value="region">Region</option>
              </select>
              <input
                type="text"
                placeholder={bulkUpdateField === 'score' ? 'Enter score (0-100)' : `Enter ${bulkUpdateField}`}
                value={bulkUpdateValue}
                onChange={(e) => setBulkUpdateValue(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-secondary)',
                  color: 'var(--color-text)',
                  fontSize: 13
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleBulkUpdate}
                  disabled={bulkUpdating || !bulkUpdateValue.trim()}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#000000',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: (bulkUpdating || !bulkUpdateValue.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (bulkUpdating || !bulkUpdateValue.trim()) ? 0.6 : 1,
                    flex: 1
                  }}
                >
                  {bulkUpdating ? '⏳...' : 'Apply'}
                </button>
                <button
                  onClick={() => {
                    setBulkActionType(null);
                    setBulkUpdateValue('');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    color: 'var(--color-text)',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

