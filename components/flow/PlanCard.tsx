"use client";
import React from "react";

type PlanCardProps = {
  title: string;
  items?: string[];
  badge?: string;
  onEdit?: () => void;
};

export default function PlanCard({ title, items = [], badge, onEdit }: PlanCardProps) {
  return (
    <div 
      className="card-enhanced" 
      style={{ 
        padding: '24px',
        borderRadius: '16px',
        transition: 'all 0.3s ease',
        cursor: onEdit ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        if (onEdit) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(37, 99, 235, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        if (onEdit) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--elev-shadow-lg)';
        }
      }}
      onClick={onEdit}
    >
      {/* Subtle gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'linear-gradient(90deg, #2563EB 0%, #06B6D4 100%)',
        opacity: 0.6
      }} />
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '16px',
        position: 'relative',
        zIndex: 1
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '700', 
          color: 'var(--color-text)',
          margin: 0,
          letterSpacing: '-0.01em'
        }}>
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {badge && (
            <span style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
              color: '#2563EB',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              border: '1px solid rgba(37, 99, 235, 0.2)'
            }}>
              {badge}
            </span>
          )}
          {onEdit && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={{
                background: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                color: '#2563EB',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '8px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.4)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.2)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <span>✏️</span>
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        {items.length === 0 ? (
          <p style={{ 
            fontSize: '13px', 
            color: 'var(--color-text-muted)',
            fontStyle: 'italic',
            margin: 0
          }}>
            No items configured
          </p>
        ) : (
          <ul style={{ 
            fontSize: '13px', 
            color: 'var(--color-text)', 
            margin: 0, 
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {items.map((item, i) => (
              <li 
                key={i} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '10px',
                  lineHeight: 1.6,
                  padding: '8px 0',
                  borderBottom: i < items.length - 1 ? '1px solid var(--elev-border)' : 'none'
                }}
              >
                <span style={{ 
                  color: '#2563EB', 
                  marginTop: '4px',
                  fontSize: '16px',
                  fontWeight: '700',
                  flexShrink: 0
                }}>
                  •
                </span>
                <span style={{ flex: 1, color: 'var(--color-text)' }}>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
