"use client";
import { useState } from "react";

interface TourButtonProps {
  onStart: () => void;
}

export default function TourButton({ onStart }: TourButtonProps) {
  return (
    <button
      onClick={onStart}
      style={{
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.2) 0%, rgba(var(--color-primary-rgb), 0.1) 100%)',
        color: 'var(--color-text)',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, var(--color-primary) 0%, #F29F67 100%)';
        e.currentTarget.style.color = '#000';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.2) 0%, rgba(var(--color-primary-rgb), 0.1) 100%)';
        e.currentTarget.style.color = 'var(--color-text)';
      }}
    >
      <span>🎯</span>
      <span>Start Tour</span>
    </button>
  );
}

