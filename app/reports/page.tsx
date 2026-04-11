"use client";
import { useState, useEffect } from "react";
import { StatCard, ProgressBar, CircularProgress } from "@/components/ui/DataVisualization";
import { apiRequest } from "@/lib/apiClient";
import { useBase } from "@/context/BaseContext";
import { Icons } from "@/components/ui/Icons";
import BaseCard from "@/components/ui/BaseCard";

// Enhanced Line Chart Component for trends with better context
const LineChart = ({ 
  data, 
  dataKey,
  color = "#7C3AED",
  height = 220
}: {
  data: { date: string; [key: string]: any }[];
  dataKey: string;
  color?: string;
  height?: number;
}) => {
  if (!data || data.length === 0) return null;
  
  const values = data.map(d => d[dataKey] || 0);
  const max = Math.max(...values, 1);
  const min = 0; // Start from 0 for better context
  const range = max - min || 1;
  const total = values.reduce((a, b) => a + b, 0);
  const average = total / values.length;
  const peak = Math.max(...values);
  const peakDay = data[values.indexOf(peak)]?.date;
  
  const chartWidth = 100;
  const chartHeight = height - 60; // Leave space for labels
  const leftPadding = 8;
  
  const points = data.map((d, i) => {
    const x = leftPadding + (i / (data.length - 1 || 1)) * (chartWidth - leftPadding * 2);
    const y = 30 + chartHeight - ((d[dataKey] - min) / range) * chartHeight;
    return { x, y, value: d[dataKey], date: d.date };
  });
  
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${chartWidth - leftPadding} ${30 + chartHeight} L ${leftPadding} ${30 + chartHeight} Z`;
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* Summary Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 12, 
        marginBottom: 16,
        padding: '12px 14px',
        background: 'var(--color-surface-secondary)',
        borderRadius: 10,
        border: '1px solid var(--color-border)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color }}>
            {total.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Total Added
          </div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
            {average.toFixed(1)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Daily Average
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#4ecdc4' }}>
            {peak}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Peak Day
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ position: 'relative' }}>
        {/* Y-axis labels */}
        <div style={{ 
          position: 'absolute', 
          left: 0, 
          top: 30, 
          height: chartHeight, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          fontSize: 9,
          color: 'var(--color-text-muted)',
          width: 24,
          textAlign: 'right',
          paddingRight: 4
        }}>
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        
        <svg viewBox={`0 0 ${chartWidth} ${height - 30}`} style={{ width: '100%', height: height - 30 }}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          <line x1={leftPadding} y1={30} x2={chartWidth - leftPadding} y2={30} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1={leftPadding} y1={30 + chartHeight/2} x2={chartWidth - leftPadding} y2={30 + chartHeight/2} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1={leftPadding} y1={30 + chartHeight} x2={chartWidth - leftPadding} y2={30 + chartHeight} stroke="var(--color-border)" strokeWidth="0.5" />
          
          {/* Area fill */}
          <path d={areaD} fill={`url(#gradient-${dataKey})`} />
          
          {/* Line */}
          <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Data points with values */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="#fff" strokeWidth="1.5" />
              {/* Show value on hover area - simplified for now */}
            </g>
          ))}
        </svg>
      </div>
      
      {/* X-axis labels */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        fontSize: 10, 
        color: 'var(--color-text-muted)', 
        marginTop: 6,
        paddingLeft: 24
      }}>
        <span>{formatDate(data[0]?.date)}</span>
        <span>{formatDate(data[Math.floor(data.length / 2)]?.date)}</span>
        <span>{formatDate(data[data.length - 1]?.date)}</span>
      </div>
      
      {/* Legend */}
      <div style={{ 
        fontSize: 11, 
        color: 'var(--color-text-muted)', 
        marginTop: 12,
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        New leads added per day over the selected period
      </div>
    </div>
  );
};

// Bar Chart Component
const BarChart = ({ 
  data, 
  height = 180,
  colors
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  colors?: string[];
}) => {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data.map(d => d.value), 1);
  const defaultColors = ['#7C3AED', '#A94CFF', '#ff6b6b', '#4ecdc4', '#ffa726', '#888'];
  
  return (
    <div style={{ display: 'flex', alignItems: 'end', gap: 8, height, padding: '0 4px' }}>
      {data.map((d, i) => {
        const barHeight = (d.value / max) * (height - 30);
        const color = d.color || colors?.[i] || defaultColors[i % defaultColors.length];
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)' }}>{d.value}</div>
            <div style={{
              width: '100%',
              height: Math.max(barHeight, 4),
              background: `linear-gradient(180deg, ${color} 0%, ${color}80 100%)`,
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.3s ease'
            }} />
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', whiteSpace: 'nowrap' }}>
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Funnel Component
const FunnelChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  if (!data || data.length === 0) return null;
  
  const max = data[0]?.value || 1;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((item, i) => {
        const width = Math.max((item.value / max) * 100, 20);
        const rate = i > 0 && data[i - 1].value > 0 
          ? ((item.value / data[i - 1].value) * 100).toFixed(1) 
          : null;
        
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 90, fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>
              {item.label}
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{
                width: `${width}%`,
                height: 32,
                background: `linear-gradient(90deg, ${item.color} 0%, ${item.color}80 100%)`,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'width 0.3s ease'
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  {item.value.toLocaleString()}
                </span>
              </div>
            </div>
            {rate && (
              <div style={{ width: 50, fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right' }}>
                {rate}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Donut Chart for Tier Distribution
const DonutChart = ({ 
  data, 
  size = 160 
}: { 
  data: { label: string; value: number; color: string }[];
  size?: number;
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  let currentOffset = 0;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {data.map((d, i) => {
            const percentage = d.value / total;
            const strokeDasharray = circumference * percentage;
            const strokeDashoffset = -currentOffset;
            currentOffset += circumference * percentage;
            
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeDasharray} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dasharray 0.3s ease' }}
              />
            );
          })}
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>{total}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Total</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: d.color }} />
            <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{d.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: d.color, marginLeft: 'auto' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ReportsPage() {
  const { activeBaseId } = useBase();
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportsData, setReportsData] = useState<any>(null);

  const periods = [
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" }
  ];

  useEffect(() => {
    const fetchReports = async () => {
      if (!activeBaseId) {
        setReportsData(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest(`/analytics?base_id=${activeBaseId}&period=${selectedPeriod}`);
        setReportsData(data);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
        setError((error as any)?.message || 'Failed to fetch analytics');
        setReportsData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [selectedPeriod, activeBaseId]);

  const tierData = reportsData?.tierDistribution ? [
    { label: 'Hot', value: reportsData.tierDistribution.hot || 0, color: '#ff6b6b' },
    { label: 'Warm', value: reportsData.tierDistribution.warm || 0, color: '#ffa726' },
    { label: 'Cold', value: reportsData.tierDistribution.cold || 0, color: '#64b5f6' },
    { label: 'Converted', value: reportsData.tierDistribution.converted || 0, color: '#4ecdc4' },
    { label: 'Unassigned', value: reportsData.tierDistribution.none || 0, color: '#888' }
  ].filter(d => d.value > 0) : [];

  const scoreData = reportsData?.scoreDistribution?.filter((d: any) => d.count > 0).map((d: any) => ({
    label: d.label,
    value: d.count
  })) || [];

  const funnelData = reportsData?.funnel ? [
    { label: 'Total Leads', value: reportsData.funnel.totalLeads || 0, color: '#7C3AED' },
    { label: 'Contacted', value: reportsData.funnel.contacted || 0, color: '#A94CFF' },
    { label: 'Replied', value: reportsData.funnel.replied || 0, color: '#ffa726' },
    { label: 'Converted', value: reportsData.funnel.converted || 0, color: '#4ecdc4' }
  ] : [];

  const leadChange = typeof reportsData?.leadChange === "number" ? reportsData.leadChange : 0;
  const replyChange = typeof reportsData?.replyChange === "number" ? reportsData.replyChange : 0;
  const conversionChange = typeof reportsData?.conversionChange === "number" ? reportsData.conversionChange : 0;
  const replyRate = typeof reportsData?.replyRate === "number" ? reportsData.replyRate : 0;
  const conversionRate = typeof reportsData?.conversionRate === "number" ? reportsData.conversionRate : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <BaseCard style={{
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16
      }}>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {periods.map((period) => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value)}
              style={{
                background: selectedPeriod === period.value 
                  ? 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)' 
                  : 'var(--color-surface-secondary)',
                border: selectedPeriod === period.value 
                  ? 'none' 
                  : '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '8px 16px',
                color: selectedPeriod === period.value ? '#fff' : 'var(--color-text)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {period.label}
            </button>
          ))}
          
          {!activeBaseId && (
            <div style={{ 
              padding: '8px 14px', 
              background: 'rgba(255, 107, 107, 0.1)', 
              borderRadius: 8,
              color: '#ff6b6b',
              fontSize: 13,
              fontWeight: 500
            }}>
              Select a workspace
            </div>
          )}
        </div>
      </BaseCard>

      {error && (
        <div style={{
          borderRadius: 12,
          padding: 16,
          border: '1px solid rgba(255, 107, 107, 0.25)',
          background: 'rgba(255, 107, 107, 0.08)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Failed to load analytics</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{error}</div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              background: 'var(--color-surface)',
              borderRadius: 12,
              padding: 24,
              border: '1px solid var(--color-border)'
            }}>
              <div className="loading-skeleton" style={{ height: 14, width: '60%', marginBottom: 12 }} />
              <div className="loading-skeleton" style={{ height: 32, width: '50%' }} />
            </div>
          ))}
        </div>
      ) : reportsData ? (
        <>
          {/* Key Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <StatCard
              title="Total Leads"
              value={reportsData.totalLeads?.toLocaleString() || '0'}
              change={`${leadChange >= 0 ? '+' : ''}${leadChange.toFixed(1)}%`}
              trend={leadChange > 0 ? 'up' : leadChange < 0 ? 'down' : 'stable'}
              icon={<Icons.Users size={20} />}
              color="#7C3AED"
            />
            <StatCard
              title="Reply Rate"
              value={`${replyRate.toFixed(1)}%`}
              change={`${replyChange >= 0 ? '+' : ''}${replyChange.toFixed(1)} pp`}
              trend={replyChange > 0 ? 'up' : replyChange < 0 ? 'down' : 'stable'}
              icon={<Icons.MessageCircle size={20} />}
              color="#A94CFF"
            />
            <StatCard
              title="Conversions"
              value={reportsData.conversions?.toLocaleString() || '0'}
              change={`${conversionChange >= 0 ? '+' : ''}${conversionChange.toFixed(1)}%`}
              trend={conversionChange > 0 ? 'up' : conversionChange < 0 ? 'down' : 'stable'}
              icon={<Icons.CheckCircle size={20} />}
              color="#4ecdc4"
            />
            <StatCard
              title="Hot Leads"
              value={reportsData.hotLeads?.toLocaleString() || '0'}
              change="ready to convert"
              trend="up"
              icon={<Icons.Flame size={20} />}
              color="#ff6b6b"
            />
          </div>

          {/* Charts Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
            {/* Lead Trends */}
            <BaseCard style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icons.TrendingUp size={18} style={{ color: '#7C3AED' }} />
                Lead Acquisition Trend
              </h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>
                How many new leads were added each day
              </p>
              {reportsData.dailyTrends && reportsData.dailyTrends.length > 0 ? (
                <LineChart 
                  data={reportsData.dailyTrends} 
                  dataKey="leads" 
                  color="#7C3AED"
                  height={240}
                />
              ) : (
                <div style={{ 
                  color: 'var(--color-text-muted)', 
                  fontSize: 14, 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  background: 'var(--color-surface-secondary)',
                  borderRadius: 10,
                  border: '1px dashed var(--color-border)'
                }}>
                  <Icons.Chart size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                  <div>No trend data available</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Add leads to see your growth trend</div>
                </div>
              )}
            </BaseCard>

            {/* Conversion Funnel */}
            <BaseCard style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icons.Target size={18} style={{ color: '#A94CFF' }} />
                Conversion Funnel
              </h3>
              {funnelData.length > 0 ? (
                <FunnelChart data={funnelData} />
              ) : (
                <div style={{ color: 'var(--color-text-muted)', fontSize: 14, textAlign: 'center', padding: 40 }}>
                  No funnel data available
                </div>
              )}
            </BaseCard>
          </div>

          {/* Charts Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 20 }}>
            {/* Tier Distribution */}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 14,
              padding: 24,
              border: '1px solid var(--color-border)'
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icons.Flame size={18} style={{ color: '#ff6b6b' }} />
                Lead Temperature
              </h3>
              {tierData.length > 0 ? (
                <DonutChart data={tierData} size={140} />
              ) : (
                <div style={{ color: 'var(--color-text-muted)', fontSize: 14, textAlign: 'center', padding: 40 }}>
                  No tier data available
                </div>
              )}
            </div>

            {/* Score Distribution */}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 14,
              padding: 24,
              border: '1px solid var(--color-border)'
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icons.Chart size={18} style={{ color: '#4ecdc4' }} />
                Score Distribution
              </h3>
              {scoreData.length > 0 ? (
                <BarChart 
                  data={scoreData} 
                  height={160}
                  colors={['#ef4444', '#f97316', '#eab308', '#22c55e', '#7C3AED', '#888']}
                />
              ) : (
                <div style={{ color: 'var(--color-text-muted)', fontSize: 14, textAlign: 'center', padding: 40 }}>
                  No score data available
                </div>
              )}
            </div>
          </div>

          {/* Data Quality Section */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 14,
            padding: 24,
            border: '1px solid var(--color-border)'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icons.Sparkles size={18} style={{ color: '#A94CFF' }} />
              Data Quality
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Enrichment Coverage</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#A94CFF' }}>
                    {reportsData.enrichmentRate?.toFixed(1) || 0}%
                  </span>
                </div>
                <ProgressBar value={reportsData.enrichmentRate || 0} max={100} color="#A94CFF" showPercentage={false} />
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
                  {reportsData.enrichedLeads || 0} of {reportsData.totalLeads || 0} leads enriched
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Phone Numbers</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#7C3AED' }}>
                    {reportsData.phoneRate?.toFixed(1) || 0}%
                  </span>
                </div>
                <ProgressBar value={reportsData.phoneRate || 0} max={100} color="#7C3AED" showPercentage={false} />
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
                  {reportsData.leadsWithPhone || 0} leads with phone numbers
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Email Addresses</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#4ecdc4' }}>
                    {reportsData.emailRate?.toFixed(1) || 0}%
                  </span>
                </div>
                <ProgressBar value={reportsData.emailRate || 0} max={100} color="#4ecdc4" showPercentage={false} />
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
                  {reportsData.leadsWithEmail || 0} leads with email addresses
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
            {/* Top Campaigns */}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 14,
              padding: 24,
              border: '1px solid var(--color-border)'
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icons.Rocket size={18} style={{ color: '#A94CFF' }} />
                Top Campaigns
              </h3>
              {reportsData.topCampaigns && reportsData.topCampaigns.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reportsData.topCampaigns.slice(0, 5).map((campaign: any, i: number) => (
                    <div key={campaign.id || i} style={{
                      background: 'var(--color-surface-secondary)',
                      borderRadius: 10,
                      padding: 14,
                      border: '1px solid var(--color-border)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{campaign.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {campaign.sent_count} sent
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar 
                            value={campaign.reply_rate || 0} 
                            max={100} 
                            color="#A94CFF" 
                            showPercentage={false}
                          />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#A94CFF', minWidth: 50 }}>
                          {(campaign.reply_rate || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--color-text-muted)', fontSize: 14, textAlign: 'center', padding: 32 }}>
                  No campaign data available
                </div>
              )}
            </div>

            {/* Top Leads */}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 14,
              padding: 24,
              border: '1px solid var(--color-border)'
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icons.Star size={18} style={{ color: '#ffa726' }} />
                Top Scoring Leads
              </h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>
                Leads ranked by AI quality score (0-100)
              </p>
              {reportsData.topLeads && reportsData.topLeads.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {reportsData.topLeads.slice(0, 5).map((lead: any, i: number) => {
                    const score = typeof lead.score === 'number' ? lead.score : 0;
                    const scoreColor = score >= 80 ? '#7C3AED' : score >= 60 ? '#ffa726' : '#ff6b6b';
                    const scoreLabel = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Low';
                    
                    return (
                      <div key={lead.id || i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 14px',
                        background: 'var(--color-surface-secondary)',
                        borderRadius: 10,
                        border: '1px solid var(--color-border)'
                      }}>
                        {/* Rank */}
                        <div style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          background: i === 0 ? 'linear-gradient(135deg, #ffa726 0%, #ff9800 100%)' : 
                                     i === 1 ? 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)' :
                                     i === 2 ? 'linear-gradient(135deg, #cd7f32 0%, #a0522d 100%)' :
                                     'var(--color-surface)',
                          color: i < 3 ? '#fff' : 'var(--color-text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          {i + 1}
                        </div>
                        
                        {/* Lead Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead.name || 'Unknown Lead'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead.company || 'No company'}
                          </div>
                        </div>
                        
                        {/* Score Badge */}
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center',
                          gap: 2,
                          minWidth: 50
                        }}>
                          <div style={{
                            background: `linear-gradient(135deg, ${scoreColor} 0%, ${scoreColor}cc 100%)`,
                            color: '#fff',
                            padding: '4px 10px',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 700,
                            minWidth: 40,
                            textAlign: 'center'
                          }}>
                            {score}
                          </div>
                          <div style={{ fontSize: 9, color: scoreColor, fontWeight: 500 }}>
                            {scoreLabel}
                          </div>
                        </div>
                        
                        {/* Tier Badge */}
                        {lead.tier && (
                          <span style={{
                            background: lead.tier === 'Hot' ? 'rgba(255, 107, 107, 0.15)' : 
                                       lead.tier === 'Warm' ? 'rgba(255, 167, 38, 0.15)' : 
                                       lead.tier === 'Converted' ? 'rgba(78, 205, 196, 0.15)' :
                                       'rgba(158, 158, 158, 0.15)',
                            color: lead.tier === 'Hot' ? '#ff6b6b' : 
                                   lead.tier === 'Warm' ? '#ffa726' : 
                                   lead.tier === 'Converted' ? '#4ecdc4' : '#9e9e9e',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            border: `1px solid ${
                              lead.tier === 'Hot' ? 'rgba(255, 107, 107, 0.3)' : 
                              lead.tier === 'Warm' ? 'rgba(255, 167, 38, 0.3)' : 
                              lead.tier === 'Converted' ? 'rgba(78, 205, 196, 0.3)' :
                              'rgba(158, 158, 158, 0.3)'
                            }`
                          }}>
                            {lead.tier}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ 
                  color: 'var(--color-text-muted)', 
                  fontSize: 14, 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  background: 'var(--color-surface-secondary)',
                  borderRadius: 10,
                  border: '1px dashed var(--color-border)'
                }}>
                  <Icons.Users size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                  <div>No scored leads yet</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Score your leads to see rankings here</div>
                </div>
              )}
            </div>
          </div>

          {/* Timestamp */}
          {reportsData.generated_at && (
            <div style={{ 
              textAlign: 'center', 
              fontSize: 12, 
              color: 'var(--color-text-muted)',
              padding: '8px 0'
            }}>
              Last updated: {new Date(reportsData.generated_at).toLocaleString()}
            </div>
          )}
        </>
      ) : activeBaseId ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 24px',
          background: 'var(--color-surface)',
          borderRadius: 16,
          border: '1px dashed var(--color-border)'
        }}>
          <Icons.Chart size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.5, marginBottom: 16 }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: 16 }}>
            Loading analytics data...
          </p>
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '80px 24px',
          background: 'var(--color-surface)',
          borderRadius: 16,
          border: '1px dashed var(--color-border)'
        }}>
          <Icons.Folder size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.5, marginBottom: 16 }} />
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Select a Workspace</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Choose a workspace from the sidebar to view analytics
          </p>
        </div>
      )}
    </div>
  );
}
