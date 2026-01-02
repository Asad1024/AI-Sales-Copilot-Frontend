"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useBase } from "@/context/BaseContext";
import { apiRequest } from "@/lib/apiClient";
import { Icons } from "./Icons";

export default function BaseSelector() {
  const router = useRouter();
  const { bases, activeBaseId, setActiveBaseId, refreshBases } = useBase();
  const activeBase = bases.find(b => b.id === activeBaseId);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [baseName, setBaseName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateBase = async () => {
    if (!baseName.trim()) return;
    try {
      setLoading(true);
      const data = await apiRequest("/bases", {
        method: "POST",
        body: JSON.stringify({ user_id: 1, name: baseName.trim() })
      });
      await refreshBases();
      if (data?.base?.id) {
        setActiveBaseId(data.base.id);
        router.push(`/bases/${data.base.id}/leads`);
      }
      setBaseName("");
      setModalOpen(false);
    } catch (error: any) {
      alert(error?.message || "Failed to create base.");
    } finally {
      setLoading(false);
    }
  };

  const selectBase = (baseId: number) => {
    setActiveBaseId(baseId);
    setDropdownOpen(false);
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/bases/')) {
      const pathParts = currentPath.split('/');
      const route = pathParts.slice(3).join('/');
      router.push(`/bases/${baseId}${route ? `/${route}` : '/leads'}`);
    } else {
      router.push(`/bases/${baseId}/leads`);
    }
  };
  
  return (
    <>
      {/* Dropdown trigger */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            minWidth: '140px',
            justifyContent: 'space-between'
          }}
        >
          <span style={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            maxWidth: '120px'
          }}>
            {activeBase?.name || 'Select workspace'}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.5 }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              minWidth: '200px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              zIndex: 1000,
              overflow: 'hidden'
            }}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            {/* Search/header */}
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Workspaces
              </div>
            </div>
            
            {/* Base list */}
            <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '4px' }}>
              {bases.length === 0 ? (
                <div style={{ padding: '12px', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  No workspaces yet
                </div>
              ) : (
                bases.map(base => (
                  <button
                    key={base.id}
                    onClick={() => selectBase(base.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: 'none',
                      background: base.id === activeBaseId ? 'var(--color-surface-secondary)' : 'transparent',
                      color: 'var(--color-text)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      if (base.id !== activeBaseId) e.currentTarget.style.background = 'var(--color-surface-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      if (base.id !== activeBaseId) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Icons.Folder size={14} style={{ opacity: 0.6 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {base.name}
                    </span>
                    {base.id === activeBaseId && (
                      <Icons.CheckCircle size={14} style={{ marginLeft: 'auto', color: '#2563eb' }} />
                    )}
                  </button>
                ))
              )}
            </div>
            
            {/* Create new */}
            <div style={{ padding: '4px', borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={() => { setDropdownOpen(false); setModalOpen(true); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: '#2563eb',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Icons.Plus size={14} />
                New workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {modalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setModalOpen(false)}
        >
          <div 
            style={{
              background: 'var(--color-surface)',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
              New workspace
            </h3>
            
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Name
            </label>
            <input
              type="text"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              placeholder="e.g., Q4 Outreach"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                marginBottom: '20px'
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && baseName.trim()) handleCreateBase();
                if (e.key === 'Escape') setModalOpen(false);
              }}
            />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBase}
                disabled={loading || !baseName.trim()}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  border: 'none',
                  borderRadius: '6px',
                  background: loading || !baseName.trim() ? '#93c5fd' : '#2563eb',
                  color: '#fff',
                  cursor: loading || !baseName.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
