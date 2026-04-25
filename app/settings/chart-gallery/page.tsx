"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import BaseCard from "@/components/ui/BaseCard";
import { KpiEnterpriseChart, type EnterpriseChartVariant } from "@/components/dashboard/KpiEnterpriseChart";

/** Dummy week of counts for KPI-style mini charts */
const DUMMY_VALUES = [3, 7, 5, 12, 9, 14, 11];

function fiveNumberSummary(values: number[]): [number, number, number, number, number] {
  const s = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length === 0) return [0, 0, 0, 0, 0];
  if (s.length === 1) {
    const v = s[0]!;
    return [v, v, v, v, v];
  }
  const n = s.length;
  const min = s[0]!;
  const max = s[n - 1]!;
  const q = (p: number) => {
    const pos = (n - 1) * p;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return s[lo]!;
    return s[lo]! * (hi - pos) + s[hi]! * (pos - lo);
  };
  return [min, q(0.25), q(0.5), q(0.75), max];
}

function RawMiniChart({ option, height = 200 }: { option: EChartsOption; height?: number }) {
  return (
    <ReactECharts
      option={option}
      style={{ height, width: "100%" }}
      opts={{ renderer: "canvas" }}
      notMerge
      lazyUpdate
    />
  );
}

function KpiTile({
  index,
  title,
  subtitle,
  variant,
}: {
  index: number;
  title: string;
  subtitle?: string;
  variant: EnterpriseChartVariant;
}) {
  return (
    <BaseCard
      style={{
        borderRadius: 14,
        padding: 16,
        border: "1px solid var(--color-border)",
        minHeight: 0,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-text-muted)" }}>
        {index}. {title}
      </div>
      {subtitle ? (
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4, marginBottom: 10 }}>{subtitle}</div>
      ) : (
        <div style={{ height: 8 }} />
      )}
      <KpiEnterpriseChart values={DUMMY_VALUES} title={title} variant={variant} height={168} />
    </BaseCard>
  );
}

export default function SettingsChartGalleryPage() {
  const router = useRouter();
  const isProduction = process.env.NODE_ENV === "production";

  useEffect(() => {
    if (isProduction) {
      router.replace("/settings");
    }
  }, [isProduction, router]);

  if (isProduction) return null;

  const primary = "rgb(234, 88, 44)";
  const primarySoft = "rgba(234, 88, 44, 0.35)";
  const axisMuted = "rgba(15, 23, 42, 0.35)";
  const labelMuted = "rgba(15, 23, 42, 0.72)";
  const gridLight = "rgba(15, 23, 42, 0.07)";
  const cats = ["1", "2", "3", "4", "5", "6", "7"];

  const sunburstOption = useMemo<EChartsOption>(
    () => ({
      animation: false,
      tooltip: { show: false },
      series: [
        {
          type: "sunburst",
          radius: ["8%", "92%"],
          data: DUMMY_VALUES.map((v, i) => ({
            name: cats[i]!,
            value: Math.max(v, 0.5),
            itemStyle: { color: i % 2 === 0 ? primarySoft : primary },
          })),
          label: { show: false },
          itemStyle: { borderColor: "#fff", borderWidth: 1 },
        },
      ],
    }),
    []
  );

  const heatmapOption = useMemo<EChartsOption>(
    () => ({
      animation: false,
      tooltip: { show: false },
      grid: { left: 48, right: 12, top: 12, bottom: 32 },
      xAxis: { type: "category", data: cats, axisLabel: { color: labelMuted } },
      yAxis: { type: "category", data: [""], show: false },
      visualMap: { show: false, min: 0, max: 16, inRange: { color: ["rgba(15,23,42,0.06)", primary] } },
      series: [{ type: "heatmap", data: DUMMY_VALUES.map((v, i) => [i, 0, v]), label: { show: false } }],
    }),
    []
  );

  const boxOption = useMemo<EChartsOption>(() => {
    const [lo, q1, med, q3, hi] = fiveNumberSummary(DUMMY_VALUES);
    return {
      animation: false,
      tooltip: { show: false },
      grid: { left: 48, right: 16, top: 16, bottom: 36 },
      xAxis: { type: "category", data: ["Week"], axisLabel: { color: labelMuted } },
      yAxis: {
        type: "value",
        min: 0,
        max: hi + 2,
        splitLine: { lineStyle: { color: gridLight } },
        axisLabel: { color: labelMuted },
      },
      series: [
        {
          type: "boxplot",
          data: [[lo, q1, med, q3, hi]],
          itemStyle: { color: "rgba(234, 88, 44, 0.25)", borderColor: primary },
        },
      ],
    };
  }, []);

  const waterfallOption = useMemo<EChartsOption>(() => {
    const bottom: number[] = [];
    let acc = 0;
    for (const v of DUMMY_VALUES) {
      bottom.push(acc);
      acc += v;
    }
    return {
      animation: false,
      tooltip: { show: false },
      grid: { left: 44, right: 10, top: 12, bottom: 28 },
      xAxis: { type: "category", data: cats, axisLabel: { color: labelMuted } },
      yAxis: { type: "value", min: 0, max: acc, axisLabel: { color: labelMuted }, splitLine: { lineStyle: { color: gridLight } } },
      series: [
        { type: "bar", stack: "w", data: bottom, itemStyle: { color: "transparent" } },
        { type: "bar", stack: "w", data: DUMMY_VALUES, itemStyle: { color: primary, borderRadius: [3, 3, 0, 0] } },
      ],
    };
  }, []);

  const funnelOption = useMemo<EChartsOption>(() => {
    const sorted = cats
      .map((name, i) => ({ name, value: DUMMY_VALUES[i]! }))
      .sort((a, b) => b.value - a.value);
    return {
      animation: false,
      tooltip: { show: false },
      series: [
        {
          type: "funnel",
          sort: "descending",
          minSize: "14%",
          maxSize: "92%",
          gap: 2,
          data: sorted,
          label: { show: false },
          itemStyle: { borderColor: "#fff", borderWidth: 1, color: primary },
        },
      ],
    };
  }, []);

  const gaugeOption = useMemo<EChartsOption>(
    () => ({
      animation: false,
      tooltip: { show: false },
      series: [
        {
          type: "gauge",
          min: 0,
          max: 16,
          splitNumber: 4,
          radius: "92%",
          center: ["50%", "55%"],
          startAngle: 200,
          endAngle: -20,
          axisLine: { lineStyle: { width: 10, color: [[1, "rgba(15,23,42,0.1)"]] } },
          progress: { show: true, width: 10, itemStyle: { color: primary } },
          pointer: { length: "52%", width: 3, itemStyle: { color: primary } },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { color: labelMuted, distance: 12, fontSize: 10 },
          detail: { show: false },
          data: [{ value: DUMMY_VALUES[DUMMY_VALUES.length - 1] }],
        },
      ],
    }),
    []
  );

  const radarOption = useMemo<EChartsOption>(
    () => ({
      animation: false,
      tooltip: { show: false },
      radar: {
        indicator: cats.map((name) => ({ name, max: 16 })),
        radius: "62%",
        center: ["50%", "52%"],
        splitNumber: 2,
        axisName: { color: labelMuted, fontSize: 10 },
        splitLine: { lineStyle: { color: axisMuted } },
        splitArea: { show: true, areaStyle: { color: ["rgba(15,23,42,0.02)", "rgba(15,23,42,0.05)"] } },
      },
      series: [
        {
          type: "radar",
          symbol: "none",
          lineStyle: { width: 2, color: primary },
          areaStyle: { color: "rgba(234, 88, 44, 0.2)" },
          data: [{ value: [...DUMMY_VALUES] }],
        },
      ],
    }),
    []
  );

  const parallelOption = useMemo<EChartsOption>(
    () => ({
      animation: false,
      tooltip: { show: false },
      parallelAxis: cats.map((name, dim) => ({
        dim,
        name,
        type: "value" as const,
        min: 0,
        max: 16,
        nameTextStyle: { fontSize: 10, color: labelMuted },
      })),
      parallel: { left: 36, right: 12, top: 28, bottom: 20 },
      series: [{ type: "parallel", lineStyle: { width: 2.5, color: primary }, data: [[...DUMMY_VALUES]] }],
    }),
    []
  );

  const geoScatterOption = useMemo<EChartsOption>(
    () => ({
      animation: false,
      tooltip: { show: false },
      grid: { left: 48, right: 16, top: 16, bottom: 36 },
      xAxis: {
        type: "value",
        name: "Lon (demo)",
        nameLocation: "middle",
        nameGap: 28,
        min: 0,
        max: 100,
        axisLabel: { color: labelMuted },
        splitLine: { lineStyle: { color: gridLight } },
      },
      yAxis: {
        type: "value",
        name: "Lat (demo)",
        min: 0,
        max: 100,
        axisLabel: { color: labelMuted },
        splitLine: { show: false },
      },
      series: [
        {
          type: "scatter",
          data: [
            [12, 78, 6],
            [34, 52, 10],
            [56, 44, 8],
            [72, 68, 12],
            [22, 30, 5],
          ],
          symbolSize: (val: unknown) => {
            const v = val as number[];
            return 8 + (v[2] ?? 0) * 1.2;
          },
          itemStyle: { color: primary, borderColor: "#fff", borderWidth: 1 },
        },
      ],
    }),
    []
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      <div style={{ marginBottom: 20, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <Link
          href="/settings"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--color-primary)",
            textDecoration: "none",
          }}
        >
          ← Back to Settings
        </Link>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", color: "var(--color-text)" }}>Chart gallery</h1>
      <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 24, maxWidth: 720, lineHeight: 1.5 }}>
        Reference views for the 22 common chart families. Each tile uses the same dummy week of numbers{" "}
        <code style={{ fontSize: 12 }}>[{DUMMY_VALUES.join(", ")}]</code> where it fits. Geographic is a lat/lon-style
        scatter (no basemap). Chord uses a circular graph like the KPI “graph ring” variant.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 18,
        }}
      >
        <KpiTile index={1} title="Line" variant="lineTrend" />
        <KpiTile index={2} title="Area" variant="areaTrend" />
        <KpiTile index={3} title="Bar (column)" variant="dailyBars" />
        <KpiTile index={4} title="Stacked bar" subtitle="Value + remainder to ceiling" variant="stackedBarShare" />
        <KpiTile index={5} title="Histogram-style" variant="histogramBars" />
        <KpiTile index={6} title="Scatter" variant="miniScatter" />
        <KpiTile index={7} title="Bubble" variant="miniBubble" />
        <KpiTile index={8} title="Pie / donut" variant="miniPie" />
        <KpiTile index={9} title="Treemap" variant="miniTreemapDays" />

        <BaseCard style={{ borderRadius: 14, padding: 16, border: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-text-muted)" }}>
            10. Sunburst
          </div>
          <div style={{ height: 8 }} />
          <RawMiniChart option={sunburstOption} />
        </BaseCard>

        <BaseCard style={{ borderRadius: 14, padding: 16, border: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-text-muted)" }}>
            11. Heatmap
          </div>
          <div style={{ height: 8 }} />
          <RawMiniChart option={heatmapOption} />
        </BaseCard>

        <BaseCard style={{ borderRadius: 14, padding: 16, border: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-text-muted)" }}>
            12. Box plot
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, marginBottom: 8 }}>
            One box for the distribution of the dummy week
          </div>
          <RawMiniChart option={boxOption} />
        </BaseCard>

        <KpiTile
          index={13}
          title="Candlestick"
          subtitle="Open = prior close (same as KPI mini chart)"
          variant="miniCandlestick"
        />

        <BaseCard style={{ borderRadius: 14, padding: 16, border: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-text-muted)" }}>
            14. Waterfall
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, marginBottom: 8 }}>
            Running total (stacked transparent + segment)
          </div>
          <RawMiniChart option={waterfallOption} />
        </BaseCard>

        <BaseCard style={{ borderRadius: 14, padding: 16, border: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-text-muted)" }}>
            15. Funnel
          </div>
          <div style={{ height: 8 }} />
          <RawMiniChart option={funnelOption} />
        </BaseCard>

        <BaseCard style={{ borderRadius: 14, padding: 16, border: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-text-muted)" }}>
            16. Gauge
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, marginBottom: 8 }}>
            Needle = last dummy value
          </div>
          <RawMiniChart option={gaugeOption} />
        </BaseCard>

        <BaseCard style={{ borderRadius: 14, padding: 16, border: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-text-muted)" }}>
            17. Radar
          </div>
          <div style={{ height: 8 }} />
          <RawMiniChart option={radarOption} />
        </BaseCard>

        <BaseCard style={{ borderRadius: 14, padding: 16, border: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-text-muted)" }}>
            18. Parallel coordinates
          </div>
          <div style={{ height: 8 }} />
          <RawMiniChart option={parallelOption} />
        </BaseCard>

        <KpiTile index={19} title="Sankey" variant="miniSankeyChain" />
        <KpiTile index={20} title="Chord" subtitle="Circular graph (chord-like flow)" variant="miniGraphRing" />

        <BaseCard style={{ borderRadius: 14, padding: 16, border: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-text-muted)" }}>
            21. Geographic
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, marginBottom: 8 }}>
            Scatter on demo lon/lat axes (no map geometry)
          </div>
          <RawMiniChart option={geoScatterOption} />
        </BaseCard>

        <KpiTile index={22} title="Combo (bar + line)" variant="miniComboBarLine" />
      </div>
    </div>
  );
}
