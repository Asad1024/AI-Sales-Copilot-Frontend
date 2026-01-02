"use client";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/apiClient";
import { useBase } from "@/context/BaseContext";
import { BaseCard } from "./components/BaseCard";
import { Icons } from "@/components/ui/Icons";

export default function BasesPage() {
  const router = useRouter();
  const { bases, refreshBases, setActiveBaseId } = useBase();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [baseQuickStats, setBaseQuickStats] = useState<{ [key: number]: { leads: number; campaigns: number; enriched: number; scored: number } }>({});
  const [loadingStats, setLoadingStats] = useState<{ [key: number]: boolean }>({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function createBase() {
    if (!name.trim()) return;
    try {
      setLoadingCreate(true);
      await apiRequest("/bases", { method: "POST", body: JSON.stringify({ user_id: 1, name }) });
      setName("");
      setShowCreateModal(false);
      await refreshBases();
    } catch (e: any) {
      alert(e?.message || "Failed to create workspace.");
    } finally {
      setLoadingCreate(false);
    }
  }

  async function renameBase(id: number, newName: string) {
    try {
      await apiRequest(`/bases/${id}`, { method: 'PUT', body: JSON.stringify({ name: newName }) });
      await refreshBases();
    } catch (e: any) {
      alert(e?.message || "Failed to rename workspace.");
    }
  }

  async function deleteBase(id: number) {
    if (!confirm("Are you sure you want to delete this workspace?")) return;
    try {
      await apiRequest(`/bases/${id}`, { method: 'DELETE' });
      await refreshBases();
    } catch (e: any) {
      alert(e?.message || "Failed to delete workspace.");
    }
  }

  useEffect(() => {
    const fetchBaseStats = async () => {
      if (bases.length === 0) return;
      const loadingState: { [key: number]: boolean } = {};
      bases.forEach(b => { loadingState[b.id] = true; });
      setLoadingStats(loadingState);
      try {
        const response = await apiRequest('/bases/quick-stats');
        const stats = response?.stats || {};
        bases.forEach(base => { if (!stats[base.id]) stats[base.id] = { leads: 0, campaigns: 0, enriched: 0, scored: 0 }; });
        setBaseQuickStats(stats);
      } catch {
        const emptyStats: any = {};
        bases.forEach(base => { emptyStats[base.id] = { leads: 0, campaigns: 0, enriched: 0, scored: 0 }; });
        setBaseQuickStats(emptyStats);
      } finally {
        const doneLoading: { [key: number]: boolean } = {};
        bases.forEach(b => { doneLoading[b.id] = false; });
        setLoadingStats(doneLoading);
      }
    };
    fetchBaseStats();
  }, [bases]);

  const filtered = useMemo(() => {
    if (!search.trim()) return bases;
    const q = search.toLowerCase();
    return bases.filter((b: any) => String(b.name).toLowerCase().includes(q));
  }, [bases, search]);

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 72px)',
      background: '#f9fafb',
      margin: '-32px -24px',
      padding: '0'
    }}>
      {/* Header */}
      <div style={{ 
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 32px'
      }}>
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              margin: 0,
              color: '#111827'
            }}>
              All Workspaces
            </h1>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Icons.Search size={16} style={{ 
                position: 'absolute', 
                left: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }} />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search workspaces" 
                style={{ 
                  width: '220px',
                  padding: '8px 12px 8px 34px',
                  fontSize: '13px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  background: '#fff',
                  color: '#374151',
                  outline: 'none'
                }}
              />
            </div>
            
            <button 
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '500',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
            >
              <Icons.Plus size={16} />
              Create workspace
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto',
        padding: '32px'
      }}>
        {/* Empty state */}
        {bases.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '80px 20px',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              margin: '0 auto 20px', 
              borderRadius: '16px', 
              background: '#f3f4f6', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Icons.Folder size={28} style={{ color: '#9ca3af' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', color: '#111827' }}>
              No workspaces yet
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px 0', maxWidth: '360px', marginLeft: 'auto', marginRight: 'auto' }}>
              Workspaces help you organize your leads and campaigns. Create your first one to get started.
            </p>
            <button 
              onClick={() => setShowCreateModal(true)}
              style={{ 
                padding: '10px 24px', 
                fontSize: '14px',
                fontWeight: '500',
                background: '#2563eb', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer' 
              }}
            >
              Create a workspace
            </button>
          </div>
        )}

        {/* No results */}
        {filtered.length === 0 && bases.length > 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
            <Icons.Search size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ fontSize: '14px' }}>No workspaces matching "{search}"</p>
          </div>
        )}

        {/* Grid */}
        {filtered.length > 0 && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '16px'
          }}>
            {/* Create new card */}
            <div 
              onClick={() => setShowCreateModal(true)}
              style={{
                background: '#fff',
                borderRadius: '8px',
                border: '2px dashed #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                minHeight: '140px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.background = '#fff';
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                <Icons.Plus size={20} style={{ color: '#2563eb' }} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                Create new workspace
              </span>
            </div>

            {/* Base cards */}
            {filtered.map((b: any) => (
              <BaseCard
                key={b.id}
                base={b}
                stats={baseQuickStats[b.id] || { leads: 0, campaigns: 0, enriched: 0, scored: 0 }}
                isLoading={loadingStats[b.id] === true}
                nextSteps={[]}
                onRename={renameBase}
                onDelete={deleteBase}
                onSetActive={(id) => { setActiveBaseId(id); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.5)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 100 
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            style={{ 
              background: '#fff', 
              borderRadius: '12px', 
              padding: '24px', 
              width: '100%', 
              maxWidth: '420px', 
              margin: '20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', color: '#111827' }}>
              Create a workspace
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0' }}>
              A workspace is a collection of leads, campaigns, and analytics.
            </p>
            
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              Workspace name
            </label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g., Q4 Sales Outreach" 
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                fontSize: '14px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '6px', 
                marginBottom: '20px',
                background: '#fff',
                color: '#374151',
                outline: 'none'
              }}
              autoFocus
              onKeyDown={(e) => { 
                if (e.key === 'Enter' && name.trim()) createBase(); 
                if (e.key === 'Escape') setShowCreateModal(false); 
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#2563eb'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
            />
            
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowCreateModal(false)} 
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '14px', 
                  background: '#fff', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  color: '#374151' 
                }}
              >
                Cancel
              </button>
              <button 
                onClick={createBase} 
                disabled={loadingCreate || !name.trim()}
                style={{ 
                  padding: '8px 20px', 
                  fontSize: '14px', 
                  background: loadingCreate || !name.trim() ? '#93c5fd' : '#2563eb', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: loadingCreate || !name.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {loadingCreate ? 'Creating...' : 'Create workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
