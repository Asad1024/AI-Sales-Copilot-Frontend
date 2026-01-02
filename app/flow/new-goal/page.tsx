"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAIPlan } from "@/lib/flowClient";

export default function NewGoalPage() {
  const [goal, setGoal] = useState("Get 30 demos with UAE real estate founders in 30 days.");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await createAIPlan(goal);
      sessionStorage.setItem("sparkai:plan", JSON.stringify(data));
      router.push("/flow/plan");
    } catch (error) {
      console.error("Failed to create AI plan:", error);
      alert("Failed to create AI plan. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          margin: '0 0 8px 0',
          background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          AI Outreach Flow
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: 'var(--color-text-muted)', 
          margin: 0 
        }}>
          Tell Spark AI your growth goal — we'll build the audience, sequence, and safety around it.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(76, 103, 255, 0.2)',
        borderRadius: '20px',
        padding: '32px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(76, 103, 255, 0.15)'
      }}>
        <label style={{ 
          display: 'block',
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '12px',
          color: 'var(--color-text)'
        }}>
          What do you want to achieve?
        </label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            minHeight: '110px',
            padding: '16px',
            borderRadius: '12px',
            border: '2px solid rgba(76, 103, 255, 0.3)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--color-text)',
            fontSize: '14px',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
            transition: 'all 0.3s ease'
          }}
          placeholder="Ex: Book 50 calls with HR managers in Dubai in 2 weeks."
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(76, 103, 255, 0.6)';
            e.target.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(76, 103, 255, 0.3)';
            e.target.style.boxShadow = 'none';
          }}
        />
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '20px 0' }}>
          {[
            "Reactivate 500 old leads from CRM and send WhatsApp first.",
            "Promote AI webinar to founders in MENA via email + LinkedIn.",
            "Sell SaaS to EU marketing directors with email + WhatsApp bump."
          ].map((example, index) => (
            <button 
              key={index}
              type="button" 
              onClick={() => setGoal(example)} 
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '20px',
                padding: '8px 16px',
                color: 'var(--color-text)',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(76, 103, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              {example}
            </button>
          ))}
        </div>

        <button 
          type="submit"
          disabled={loading || !goal.trim()}
          style={{
            background: loading || !goal.trim() 
              ? 'rgba(255, 255, 255, 0.2)' 
              : 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 28px',
            color: loading || !goal.trim() ? 'var(--color-text-muted)' : '#000000',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading || !goal.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(76, 103, 255, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid var(--color-text-muted)',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Thinking...
            </>
          ) : (
            'Generate Plan'
          )}
        </button>
      </form>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
