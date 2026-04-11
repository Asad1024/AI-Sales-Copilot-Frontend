"use client";

import { useEffect, useState } from "react";
import { getAIInbox } from "@/lib/flowClient";

export default function InboxPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAIInbox();
        setThreads(data.threads || []);
      } catch (error) {
        console.error("Failed to get inbox:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          margin: '0 0 8px 0',
          background: 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Unified Inbox
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: 'var(--color-text-muted)', 
          margin: 0 
        }}>
          See replies from email + WhatsApp for this run.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px' 
      }}>
        {loading ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '2px solid var(--color-text-muted)',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px auto'
            }} />
            <p style={{ color: 'var(--color-text-muted)' }}>Loading inbox...</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="card-enhanced" style={{
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📥</div>
            <p style={{ 
              fontSize: '16px', 
              color: 'var(--color-text-muted)', 
              margin: 0 
            }}>
              No replies yet. Campaign will push leads here automatically.
            </p>
          </div>
        ) : (
          threads.map((t) => (
            <div key={t.id} className="card-enhanced" style={{
              borderRadius: '16px',
              padding: '20px',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: '12px' 
              }}>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: 'var(--color-text)' 
                }}>
                  {t.lead_name || "Unknown Lead"}
                </span>
                <span style={{
                  background: 'rgba(124, 58, 237, 0.2)',
                  color: '#7C3AED',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: '600'
                }}>
                  {t.channel || "email"}
                </span>
              </div>
              <p style={{ 
                fontSize: '14px', 
                color: 'var(--color-text-muted)', 
                margin: '0 0 16px 0',
                lineHeight: '1.4'
              }}>
                {t.last_message}
              </p>
              <button style={{
                background: 'rgba(124, 58, 237, 0.1)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#7C3AED',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}>
                Suggest reply
              </button>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
