"use client";
import React from "react";

// Progress Bar Component
export const ProgressBar = ({ 
  value, 
  max = 100, 
  color = "var(--color-primary)", 
  label, 
  showPercentage = true 
}: {
  value: number;
  max?: number;
  color?: string;
  label?: string;
  showPercentage?: boolean;
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '8px',
          fontSize: '14px',
          color: 'var(--color-text)'
        }}>
          <span>{label}</span>
          {showPercentage && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div style={{
        width: '100%',
        height: '8px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color} 0%, ${color}80 100%)`,
          transition: 'width 0.3s ease',
          borderRadius: '4px'
        }} />
      </div>
    </div>
  );
};

// Circular Progress Component
export const CircularProgress = ({ 
  value, 
  max = 100, 
  size = 80, 
  strokeWidth = 8, 
  color = "var(--color-primary)",
  label 
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: '8px'
    }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--color-text)'
        }}>
          {Math.round(percentage)}%
        </div>
      </div>
      {label && (
        <span style={{ 
          fontSize: '12px', 
          color: '#888',
          textAlign: 'center'
        }}>
          {label}
        </span>
      )}
    </div>
  );
};

// Mini Chart Component
export const MiniChart = ({ 
  data, 
  color = "var(--color-primary)", 
  height = 40 
}: {
  data: number[];
  color?: string;
  height?: number;
}) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  
  return (
    <div style={{ 
      width: '100%', 
      height: height,
      display: 'flex',
      alignItems: 'end',
      gap: '2px'
    }}>
      {data.map((value, index) => {
        const barHeight = range > 0 ? ((value - min) / range) * height : height / 2;
        return (
          <div
            key={index}
            style={{
              flex: 1,
              height: `${barHeight}px`,
              background: `linear-gradient(to top, ${color}40, ${color})`,
              borderRadius: '2px',
              transition: 'all 0.3s ease',
              minHeight: '2px'
            }}
          />
        );
      })}
    </div>
  );
};

// Stat Card Component
export const StatCard = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon, 
  color = "var(--color-primary)",
  chartData,
  loading = false 
}: {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  icon?: React.ReactNode;
  color?: string;
  chartData?: number[];
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <div className="skeleton-card">
        <div className="skeleton-line short" />
        <div className="skeleton-line medium" style={{ height: '24px', marginTop: '12px' }} />
        <div className="skeleton-line short" style={{ marginTop: '16px' }} />
      </div>
    );
  }

  const changeBadgeStyle =
    trend === "up"
      ? {
          background: "rgba(var(--color-primary-rgb), 0.2)",
          color: "var(--color-primary)",
          border: "1px solid rgba(var(--color-primary-rgb), 0.2)",
        }
      : trend === "down"
        ? {
            background: "rgba(239, 68, 68, 0.1)",
            color: "#dc2626",
            border: "1px solid rgba(239, 68, 68, 0.22)",
          }
        : {
            background: "var(--color-surface-secondary)",
            color: "var(--color-text-muted)",
            border: "1px solid var(--color-border)",
          };

  return (
    <div className="card-enhanced kpi-card ms-hover-scale">
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '16px' 
      }}>
        <span style={{ 
          fontSize: '14px', 
          color: '#888', 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em' 
        }}>
          {title}
        </span>
        {icon && (
          <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-text-muted)' }}>
            {icon}
          </span>
        )}
      </div>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'end', 
        justifyContent: 'space-between', 
        marginBottom: '12px' 
      }}>
        <h3 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          margin: 0, 
          color: 'var(--color-text)'
        }}>
          {value}
        </h3>
        {change && (
          <span style={{ 
            ...changeBadgeStyle,
            padding: '4px 12px', 
            borderRadius: '20px', 
            fontSize: '12px', 
            fontWeight: '600',
            lineHeight: 1.2
          }}>
            {change}
          </span>
        )}
      </div>

      {chartData && (
        <div style={{ marginTop: '16px', position: 'relative' }}>
          <MiniChart data={chartData} color={color} />
          <div className="shimmer-min" style={{ height: '3px', marginTop: '8px', background: 'rgba(255,255,255,.08)', borderRadius: '2px' }} />
        </div>
      )}
    </div>
  );
};
