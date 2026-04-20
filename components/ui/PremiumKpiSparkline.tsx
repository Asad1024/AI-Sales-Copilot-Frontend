"use client";

import { useId } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";

export type PremiumKpiChartType = "step" | "bars" | "areaPulse" | "radial";

type PremiumKpiSparklineProps = {
  points: number[];
  positive?: boolean;
  chartType?: PremiumKpiChartType;
  height?: number;
  emptyLabel?: string;
};

export function PremiumKpiSparkline({
  points,
  positive = true,
  chartType = "areaPulse",
  height = 76,
  emptyLabel = "No trend yet",
}: PremiumKpiSparklineProps) {
  const chartUid = useId().replace(/:/g, "");
  const sourcePoints = (points.length > 0 ? points : [0]).map((value) => Number(value || 0));
  const padded = [...sourcePoints];
  while (padded.length < 12) padded.unshift(sourcePoints[0] ?? 0);
  const normalized = padded.slice(-12);
  const minRaw = Math.min(...normalized);
  const maxRaw = Math.max(...normalized);
  const rawSpan = maxRaw - minRaw;
  const allZero = maxRaw <= 0.0001 && minRaw >= -0.0001;

  if (allZero) {
    return (
      <div
        style={{
          width: "100%",
          height,
          borderRadius: 10,
          border: "1px solid rgba(var(--color-primary-rgb), 0.24)",
          background:
            "linear-gradient(180deg, rgba(var(--color-primary-rgb), 0.07) 0%, rgba(var(--color-primary-rgb), 0.03) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--color-text-muted)", textTransform: "uppercase" }}>
          {emptyLabel}
        </span>
      </div>
    );
  }

  const shaped =
    rawSpan < Math.max(0.3, maxRaw * 0.1)
      ? normalized.map((value, index) =>
          Number((Math.max(0, value + Math.sin(index * 0.8 + 0.35) * Math.max(0.08, maxRaw * 0.025))).toFixed(2))
        )
      : normalized;
  const data = shaped.map((value, index) => {
    const prev = index === 0 ? value : shaped[index - 1] ?? value;
    const momentum = Math.abs(value - prev);
    const volumeFactor = chartType === "bars" ? 1.85 : 1.1;
    const volume = Number((Math.max(0.08, momentum * volumeFactor + (index % 2 === 0 ? 0.06 : 0.03))).toFixed(2));
    return { index, value: Number(value.toFixed(2)), volume };
  });

  const values = data.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = Math.max(0.8, maxValue - minValue);
  const yDomain: [number, number] = [Math.max(0, minValue - span * 0.34), maxValue + span * 0.2];
  const areaGradientId = `premium-kpi-area-${chartUid}`;
  const barGradientId = `premium-kpi-bar-${chartUid}`;
  const lineGradientId = `premium-kpi-line-${chartUid}`;
  const lineColor = positive ? "#DB8A55" : "#C8713C";
  const curveType = chartType === "step" ? "stepAfter" : "monotone";

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 10,
        background:
          "linear-gradient(180deg, rgba(var(--color-primary-rgb), 0.12) 0%, rgba(var(--color-primary-rgb), 0.05) 45%, rgba(var(--color-primary-rgb), 0.02) 100%)",
        padding: 0,
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(var(--color-primary-rgb), 0.24)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(to right, rgba(var(--color-primary-rgb), 0.1) 0px, rgba(var(--color-primary-rgb), 0.1) 1px, transparent 1px, transparent 36px)",
          opacity: 0.15,
          pointerEvents: "none",
        }}
      />
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 6, left: 6, bottom: 4 }}>
          <defs>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EDAE82" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#EDAE82" stopOpacity={0.08} />
            </linearGradient>
            <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E59D66" stopOpacity={chartType === "bars" ? 0.56 : 0.36} />
              <stop offset="100%" stopColor="#E59D66" stopOpacity={0.08} />
            </linearGradient>
            <linearGradient id={lineGradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.72} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(var(--color-primary-rgb), 0.2)" strokeDasharray="3 3" />
          <XAxis dataKey="index" hide />
          <YAxis hide domain={yDomain} />
          <Bar
            dataKey="volume"
            yAxisId={0}
            barSize={4}
            fill={`url(#${barGradientId})`}
            radius={[6, 6, 0, 0]}
            isAnimationActive
            animationDuration={340}
            animationEasing="ease-out"
          />
          <Area
            type={curveType}
            dataKey="value"
            stroke="none"
            fill={`url(#${areaGradientId})`}
            isAnimationActive
            animationDuration={360}
            animationEasing="ease-out"
          />
          <Line
            type={curveType}
            dataKey="value"
            stroke={`url(#${lineGradientId})`}
            strokeWidth={2.2}
            strokeLinecap="round"
            dot={false}
            activeDot={false}
            isAnimationActive
            animationDuration={420}
            animationEasing="ease-out"
          />
          <Line
            type="linear"
            dataKey="value"
            stroke="transparent"
            dot={(dotProps) =>
              dotProps.index === data.length - 1 ? (
                <>
                  <circle cx={dotProps.cx} cy={dotProps.cy} r={4.8} fill="rgba(219, 138, 85, 0.22)" />
                  <circle cx={dotProps.cx} cy={dotProps.cy} r={2.2} fill={lineColor} />
                </>
              ) : null
            }
            activeDot={false}
            isAnimationActive
            animationDuration={420}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

