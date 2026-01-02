"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import { Icons } from "@/components/ui/Icons";

interface BaseCardProps {
  base: any;
  stats: { leads: number; campaigns: number; enriched: number; scored: number };
  isLoading: boolean;
  nextSteps: any[];
  onRename: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onSetActive: (id: number) => void;
}

// Airtable-style color palette for base icons
const BASE_COLORS = [
  { bg: '#ffeee0', icon: '#f97316' }, // Orange
  { bg: '#e0f2fe', icon: '#0ea5e9' }, // Blue
  { bg: '#dcfce7', icon: '#22c55e' }, // Green
  { bg: '#f3e8ff', icon: '#a855f7' }, // Purple
  { bg: '#fce7f3', icon: '#ec4899' }, // Pink
  { bg: '#fef3c7', icon: '#eab308' }, // Yellow
  { bg: '#e0e7ff', icon: '#6366f1' }, // Indigo
  { bg: '#ccfbf1', icon: '#14b8a6' }, // Teal
];

export function BaseCard({ base, stats, isLoading, onRename, onDelete, onSetActive }: BaseCardProps) {
  const router = useRouter();
  const { permissions } = useBasePermissions(base.id);
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Get consistent color based on base id
  const colorIndex = base.id % BASE_COLORS.length;
  const colors = BASE_COLORS[colorIndex];

  const handleOpen = () => {
    onSetActive(base.id);
    router.push(`/bases/${base.id}/leads`);
  };

  return (
    <div 
      style={{
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        position: 'relative',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
      onClick={handleOpen}
    >
      {/* Color bar at top */}
      <div style={{
        height: '6px',
        background: colors.icon,
        borderRadius: '8px 8px 0 0'
      }} />

      <div style={{ padding: '16px' }}>
        {/* Icon and Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Icons.Folder size={20} style={{ color: colors.icon }} />
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ 
              fontSize: '15px', 
              fontWeight: '600', 
              margin: 0,
              color: '#111827',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {base.name}
            </h3>
            <p style={{ 
              fontSize: '12px', 
              color: '#6b7280', 
              margin: '2px 0 0 0' 
            }}>
              {stats.leads} leads · {stats.campaigns} campaigns
            </p>
          </div>

          {/* Menu button */}
          {(permissions.canManageSettings || permissions.canDeleteBase) && (
            <div 
              style={{ position: 'relative' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowMenu(!showMenu)}
                style={{ 
                  padding: '4px',
                  background: isHovered ? '#f3f4f6' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  display: 'flex',
                  opacity: isHovered ? 1 : 0,
                  transition: 'opacity 0.15s'
                }}
              >
                <Icons.Settings size={16} />
              </button>
              
              {showMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                  zIndex: 50,
                  minWidth: '140px',
                  overflow: 'hidden'
                }}>
                  {permissions.canManageSettings && (
                    <button 
                      onClick={() => {
                        const newName = prompt("Rename workspace:", base.name);
                        if (newName?.trim()) onRename(base.id, newName.trim());
                        setShowMenu(false);
                      }}
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        background: 'none', 
                        border: 'none', 
                        fontSize: '13px', 
                        color: '#374151', 
                        textAlign: 'left', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <Icons.Edit size={14} />
                      Rename
                    </button>
                  )}
                  {permissions.canDeleteBase && (
                    <button 
                      onClick={() => { onDelete(base.id); setShowMenu(false); }}
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        background: 'none', 
                        border: 'none', 
                        fontSize: '13px', 
                        color: '#dc2626', 
                        textAlign: 'left', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <Icons.Trash size={14} />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ 
          display: 'flex', 
          gap: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #f3f4f6'
        }}>
          {[
            { label: 'Enriched', value: stats.enriched },
            { label: 'Scored', value: stats.scored },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isLoading ? (
                <div className="loading-skeleton" style={{ height: 14, width: 24, borderRadius: 3 }} />
              ) : (
                <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                  {item.value}
                </span>
              )}
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
