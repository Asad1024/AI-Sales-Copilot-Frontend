"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAIProgress } from "@/lib/flowClient";
import { useBase } from "@/context/BaseContext";
import { useBaseStore } from "@/stores/useBaseStore";

const steps = [
  { key: "leads", label: "Leads prepared" },
  { key: "enrichment", label: "Enriched & verified" },
  { key: "segments", label: "Smart segments built" },
  { key: "campaign", label: "Campaign drafted" }
];

export default function ProgressPage() {
  const router = useRouter();
  const { setActiveBaseId, refreshBases } = useBase();
  const [progress, setProgress] = useState<any>({ status: "running" });
  const [runId, setRunId] = useState<string | null>(null);
  const [baseId, setBaseId] = useState<number | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("sparkai:run");
    if (!saved) {
      router.push("/flow/new-goal");
      return;
    }
    try {
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const { run_id, base_id } = JSON.parse(saved);
        setRunId(run_id);
        if (base_id) {
          setBaseId(base_id);
        }
      }
    } catch (error) {
      console.error('Error parsing currentRun:', error);
      localStorage.removeItem('sparkai:currentRun');
    }

    if (!runId) return;

    const interval = setInterval(async () => {
      try {
        const data = await getAIProgress(runId);
        setProgress(data);
        if (data.status === "done") {
          clearInterval(interval);
          const targetBaseId = data.base_id ?? baseId ?? null;
          refreshBases()
            .catch(() => undefined)
            .finally(() => {
              if (targetBaseId) {
                const b = useBaseStore.getState().bases.find((x) => x.id === targetBaseId);
                setActiveBaseId(targetBaseId, b ? { name: b.name } : undefined);
              }
              sessionStorage.removeItem("sparkai:run");
              router.push("/bases");
            });
        }
      } catch (error) {
        console.error("Failed to get progress:", error);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [router, runId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          margin: '0 0 8px 0',
          background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Setting up your outreach...
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: 'var(--color-text-muted)', 
          margin: 0 
        }}>
          We are generating/importing leads, enriching, segmenting and drafting the campaign.
        </p>
      </div>

      <div className="card-enhanced" style={{
        borderRadius: '20px',
        padding: '32px'
      }}>
        {steps.map((s) => {
          const done = progress?.steps?.includes(s.key);
          return (
            <div key={s.key} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: done 
                  ? 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: done ? '#000000' : 'var(--color-text-muted)',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}>
                {done ? '✓' : '○'}
              </div>
              <span style={{ 
                fontSize: '16px', 
                color: done ? 'var(--color-primary)' : 'var(--color-text)',
                fontWeight: done ? '600' : '400',
                transition: 'all 0.3s ease'
              }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
