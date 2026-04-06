"use client";
import { useState, useEffect } from "react";
import { Icons } from "./Icons";

export default function ThemeToggle({ compact }: { compact?: boolean }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('spark-theme') as 'light' | 'dark' || 'dark';
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    const isDark = newTheme === 'dark';
    
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    root.style.setProperty('--color-background', isDark ? '#000000' : '#ffffff');
    root.style.setProperty('--color-surface', isDark ? '#1a1a1a' : '#f8fafc');
    root.style.setProperty('--color-surface-secondary', isDark ? '#2a2a2a' : '#f1f5f9');
    root.style.setProperty('--color-text', isDark ? '#ffffff' : '#0f172a');
    root.style.setProperty('--color-text-muted', isDark ? '#888888' : '#475569');
    root.style.setProperty('--color-text-inverse', isDark ? '#000000' : '#ffffff');
    root.style.setProperty('--color-border', isDark ? 'rgba(255, 255, 255, 0.1)' : '#cbd5e1');
    root.style.setProperty('--color-border-light', isDark ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0');
    root.style.setProperty('--color-shadow', isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)');
    root.style.setProperty('--color-primary', '#4C67FF');
    root.style.setProperty('--color-accent', '#A94CFF');
    root.style.setProperty('--color-success', '#4C67FF');
    root.style.setProperty('--color-info', '#A94CFF');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('spark-theme', newTheme);
    applyTheme(newTheme);
  };

  const btn = compact ? 24 : 30;
  const iconSz = compact ? 14 : 18;

  if (!mounted) {
    return (
      <div style={{ width: btn, height: btn }} />
    );
  }

  return (
    <button 
      className="header-utility-btn"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        width: btn,
        height: btn,
        background: 'transparent',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-muted)',
        transition: 'all 0.15s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-surface-secondary)';
        e.currentTarget.style.color = 'var(--color-text)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--color-text-muted)';
      }}
    >
      <span
        style={{
          position: 'absolute',
          display: 'inline-flex',
          transition: 'opacity 220ms ease, transform 220ms ease',
          opacity: theme === 'light' ? 1 : 0,
          transform: `rotate(${theme === 'light' ? '0deg' : '90deg'})`,
        }}
      >
        <Icons.Sun size={iconSz} strokeWidth={1.5} />
      </span>
      <span
        style={{
          position: 'absolute',
          display: 'inline-flex',
          transition: 'opacity 220ms ease, transform 220ms ease',
          opacity: theme === 'dark' ? 1 : 0,
          transform: `rotate(${theme === 'dark' ? '0deg' : '-90deg'})`,
        }}
      >
        <Icons.Moon size={iconSz} strokeWidth={1.5} />
      </span>
    </button>
  );
}
