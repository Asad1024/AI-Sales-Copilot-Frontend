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
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%)',
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
        e.currentTarget.style.background = 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)';
        e.currentTarget.style.color = '#000';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%)';
        e.currentTarget.style.color = 'var(--color-text)';
      }}
    >
      <span>🎯</span>
      <span>Start Tour</span>
    </button>
  );
}

