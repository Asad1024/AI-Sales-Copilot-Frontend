"use client";
import { useMemo } from "react";
import { useCampaignStore } from "@/stores/useCampaignStore";

export function CampaignStats() {
  const { campaigns, loading } = useCampaignStore();

  const stats = useMemo(() => {
    const total = campaigns.length;
    const running = campaigns.filter(c => c.status === 'running').length;
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.leads || 0), 0);
    const totalSent = campaigns.reduce((sum, c) => sum + (c.sent || 0), 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + (c.opened || 0), 0);
    const totalReplied = campaigns.reduce((sum, c) => sum + (c.replied || 0), 0);
    
    const avgOpenRate = totalSent > 0 ? (totalOpened / totalSent * 100).toFixed(1) : '0';
    const avgReplyRate = totalSent > 0 ? (totalReplied / totalSent * 100).toFixed(1) : '0';
    
    return {
      total,
      running,
      totalLeads,
      totalSent,
      avgOpenRate,
      avgReplyRate
    };
  }, [campaigns]);

  if (loading || campaigns.length === 0) return null;

  return (
    <div style={{
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '16px' 
    }}>
      <div className="card-enhanced" style={{ padding: '20px', borderRadius: 16 }}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: 8 }}>Total Campaigns</div>
        <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-text)' }}>{stats.total}</div>
      </div>
      <div className="card-enhanced" style={{ padding: '20px', borderRadius: 16 }}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: 8 }}>Running</div>
        <div style={{ fontSize: '28px', fontWeight: '700', color: '#4C67FF' }}>{stats.running}</div>
      </div>
      <div className="card-enhanced" style={{ padding: '20px', borderRadius: 16 }}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: 8 }}>Avg Open Rate</div>
        <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-text)' }}>{stats.avgOpenRate}%</div>
      </div>
      <div className="card-enhanced" style={{ padding: '20px', borderRadius: 16 }}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: 8 }}>Avg Reply Rate</div>
        <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-text)' }}>{stats.avgReplyRate}%</div>
      </div>
      <div className="card-enhanced" style={{ padding: '20px', borderRadius: 16 }}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: 8 }}>Total Leads</div>
        <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-text)' }}>{stats.totalLeads.toLocaleString()}</div>
      </div>
      <div className="card-enhanced" style={{ padding: '20px', borderRadius: 16 }}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: 8 }}>Total Sent</div>
        <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-text)' }}>{stats.totalSent.toLocaleString()}</div>
      </div>
    </div>
  );
}

