"use client";
import { useLeadStore } from "@/stores/useLeadStore";
import { useNotification } from "@/context/NotificationContext";

export function SmartSegments() {
  const { filters, setFilters } = useLeadStore();
  const { showInfo } = useNotification();

  const segments = ['All', 'Engaged not converted', 'Never opened', 'Opened 3+ no reply', 'High-score low-engagement'];

  return (
    <div className="card" style={{ borderRadius:12, padding:12 }}>
      <div className="text-hint" style={{ marginBottom:8 }}>Smart Segments</div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {segments.map((s) => (
          <button 
            key={s} 
            className={filters.segment===s? 'btn-primary ms-hover-scale ms-press focus-ring':'btn-ghost ms-hover-scale ms-press focus-ring'} 
            onClick={() => setFilters({ segment: s })}
          >
            {s}
          </button>
        ))}
        <button 
          className="btn-ghost ms-hover-scale ms-press focus-ring" 
          onClick={() => showInfo('Coming Soon', 'Segment builder coming soon (stub).')}
        >
          Build Segment…
        </button>
      </div>
    </div>
  );
}

