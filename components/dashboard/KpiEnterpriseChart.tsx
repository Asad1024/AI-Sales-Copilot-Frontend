"use client";

/**
 * ERP-style KPI mini charts using Apache ECharts (theme-aware).
 */

import { useLayoutEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

export type EnterpriseChartVariant =
  | "cartesianDropLines"
  | "lineSmoothDots"
  | "dailyBars"
  /** Plain smooth line (taxonomy: line). */
  | "lineTrend"
  /** Smooth line + filled area, no point markers (taxonomy: area). */
  | "areaTrend"
  /** Stacked bar: daily value over muted “remainder” to a common ceiling (taxonomy: stacked bar). */
  | "stackedBarShare"
  /** Tight bars, borders, no rounding (taxonomy: histogram-style). */
  | "histogramBars"
  /** Points on (day, value) (taxonomy: scatter). */
  | "miniScatter"
  /** Scatter with marker size from value (taxonomy: bubble). */
  | "miniBubble"
  /** OHLC from period-to-period closes (taxonomy: candlestick). */
  | "miniCandlestick"
  /** Donut of share per day (taxonomy: pie). */
  | "miniPie"
  /** Day-to-day flow widths (taxonomy: Sankey-style). */
  | "miniSankeyChain"
  /** Circular graph, day nodes + weighted links (taxonomy: chord / graph). */
  | "miniGraphRing"
  /** Bars + overlaid line (taxonomy: combo). */
  | "miniComboBarLine"
  /** Rectangles sized by day values (taxonomy: treemap). */
  | "miniTreemapDays"
  /** Smooth dashed trend line (taxonomy: line variant). */
  | "miniDashedTrend"
  /** Radial bars per day (taxonomy: polar bar). */
  | "miniPolarBars";

/**
 * Fewer X labels without clustering only at the chart ends.
 * Numeric `interval` tends to emphasize 1 + last; we pick ~`maxVisible` evenly spaced indices.
 * ECharts: callback return `true` to hide a label.
 */
/** Y values on KPI card axes: compact labels (target ≤3 characters). */
function formatKpiCardYAxisValue(n: number): string {
  const v = Math.max(0, Math.round(Number(n)));
  if (!Number.isFinite(v)) return "";
  if (v === 0) return "0";
  if (v < 1000) return String(v);
  const k = v / 1000;
  if (v < 1_000_000) {
    const s =
      `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}`.replace(/\.0$/, "") + "k";
    return s.length <= 3 ? s : `${Math.round(k)}k`.slice(0, 3);
  }
  const m = v / 1_000_000;
  const s = `${m >= 10 ? Math.round(m) : Math.round(m * 10) / 10}`.replace(/\.0$/, "") + "m";
  return s.length <= 3 ? s : s.slice(0, 3);
}

/** Category axis (day index): show at most 3 digit characters. */
function formatKpiCardXAxisCategory(value: string): string {
  const t = String(value ?? "").trim();
  if (!t) return "";
  const n = Number(t);
  if (Number.isFinite(n)) return String(Math.round(n)).slice(0, 3);
  return t.slice(0, 3);
}

function sparseEvenCategoryAxisLabelInterval(
  categoryCount: number,
  maxVisible = 5
): number | ((index: number, value: string) => boolean) {
  const n = categoryCount;
  if (n <= 0) return 0;
  if (n <= maxVisible) return 0;

  const show = new Set<number>();
  show.add(0);
  show.add(n - 1);
  const innerSlots = Math.max(1, maxVisible - 2);
  for (let k = 1; k <= innerSlots; k++) {
    const idx = Math.round((k * (n - 1)) / (innerSlots + 1));
    show.add(Math.min(n - 1, Math.max(1, idx)));
  }
  return (index: number) => !show.has(index);
}

function parseRgbToRgba(rgb: string, alpha: number): string {
  const m = rgb.replace(/\s/g, "").match(/^rgb\((\d+),(\d+),(\d+)\)$/i);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
  return rgb;
}

function readThemePrimaryRgb(): string {
  if (typeof window === "undefined") return "234, 88, 44";
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--color-primary-rgb").trim();
  return raw || "234, 88, 44";
}

type SharedAxisOpts = {
  left: number;
  bottom: number;
  ySplitNumber: number;
  xLabelInterval: number | ((index: number, value: string) => boolean);
  /** Bars need side padding; lines use `false` so the stroke reaches the edges. */
  boundaryGap?: boolean;
  /** Fill behind the plot (e.g. primary tint in compact KPI cards). */
  plotBackground?: string;
};

type Props = {
  values: number[];
  title: string;
  variant: EnterpriseChartVariant;
  /** Total height of the chart canvas area */
  height?: number;
  /**
   * KPI card layout: symmetric grid, hidden axis labels, dotted splits — reads centered in the card.
   */
  compact?: boolean;
};

function sharedAxes(
  categories: string[],
  yCeil: number,
  opts: SharedAxisOpts,
  compact = false
): Pick<EChartsOption, "xAxis" | "yAxis" | "grid" | "tooltip" | "animation"> {
  const axisMuted = compact ? "rgba(15, 23, 42, 0.22)" : "rgba(15, 23, 42, 0.35)";
  const labelMuted = "rgba(15, 23, 42, 0.72)";
  const gridLight = compact ? "rgba(100, 70, 40, 0.09)" : "rgba(15, 23, 42, 0.07)";
  /** KPI cards: visible axes, ~3 X labels + ~3 Y ticks (splitNumber 2 → min / mid / max). */
  const left = compact ? 22 : opts.left;
  const right = compact ? 4 : 6;
  const top = compact ? 4 : 8;
  const bottom = compact ? 16 : opts.bottom;
  const ySplitNumber = compact ? 2 : opts.ySplitNumber;
  return {
    animation: false,
    tooltip: { show: false },
    grid: {
      left,
      right,
      top,
      bottom,
      containLabel: false,
      ...(opts.plotBackground ? { backgroundColor: opts.plotBackground } : {}),
    },
    xAxis: {
      type: "category",
      data: categories,
      boundaryGap: opts.boundaryGap ?? (compact ? true : false),
      axisLine: { show: true, lineStyle: { color: axisMuted, width: compact ? 1 : 1.5 } },
      axisTick: {
        alignWithLabel: true,
        lineStyle: { color: axisMuted },
        show: true,
        length: compact ? 3 : undefined,
      },
      axisLabel: {
        show: true,
        color: labelMuted,
        fontWeight: 600,
        fontSize: compact ? 8 : 10,
        interval: opts.xLabelInterval,
        ...(compact
          ? {
              formatter: (val: string) => formatKpiCardXAxisCategory(val),
              hideOverlap: true,
            }
          : {}),
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: yCeil,
      splitNumber: ySplitNumber,
      axisLine: { show: true, lineStyle: { color: axisMuted, width: compact ? 1 : 1.5 } },
      splitLine: {
        show: true,
        lineStyle: {
          color: gridLight,
          type: compact ? "dotted" : "solid",
          width: compact ? 1 : 1,
        },
      },
      axisLabel: {
        show: true,
        color: labelMuted,
        fontWeight: 600,
        fontSize: compact ? 8 : 10,
        ...(compact ? { formatter: (val: number) => formatKpiCardYAxisValue(val) } : {}),
      },
    },
  };
}

export function KpiEnterpriseChart({ values, title, variant, height = 92, compact = false }: Props) {
  const [primaryRgb, setPrimaryRgb] = useState("234, 88, 44");

  useLayoutEffect(() => {
    setPrimaryRgb(readThemePrimaryRgb());
  }, []);

  const ys = useMemo(() => values.map((v) => (Number.isFinite(v) && v >= 0 ? v : 0)), [values]);
  const n = ys.length;
  const categories = useMemo(() => Array.from({ length: n }, (_, i) => String(i + 1)), [n]);
  const yMax = Math.max(...ys, 0);
  const yCeil = yMax <= 0 ? 1 : Math.ceil(yMax * 1.12);
  /**
   * Compact KPI cards: use a **numeric** category interval so ECharts shows ~4 X labels
   * (Open rate / candlestick otherwise overlaps many tick labels into one unreadable band).
   * Non-compact: keep evenly spaced index picks via callback.
   */
  const xLabelInterval = useMemo(() => {
    if (compact) {
      if (n <= 5) return 0;
      const maxXLabels = 4;
      return Math.max(1, Math.ceil(n / maxXLabels) - 1);
    }
    return sparseEvenCategoryAxisLabelInterval(n, 5);
  }, [n, compact]);

  const option: EChartsOption = useMemo(() => {
    const primary = `rgb(${primaryRgb})`;
    const dashGuide = "rgba(15, 23, 42, 0.48)";
    const ax = (opts: SharedAxisOpts) =>
      sharedAxes(
        categories,
        yCeil,
        {
          ...opts,
          ...(compact && !opts.plotBackground
            ? { plotBackground: parseRgbToRgba(primary, 0.12) }
            : {}),
        },
        compact
      );

    if (variant === "lineTrend") {
      const base = ax({
        left: 30,
        bottom: 22,
        ySplitNumber: 1,
        xLabelInterval,
      });
      return {
        ...base,
        series: [
          {
            type: "line",
            smooth: 0.35,
            smoothMonotone: "x",
            symbol: "none",
            sampling: "none",
            data: ys,
            lineStyle: { width: 3, color: primary, cap: "round", join: "round" },
          },
        ],
      };
    }

    if (variant === "areaTrend") {
      const base = ax({
        left: 30,
        bottom: 22,
        ySplitNumber: 1,
        xLabelInterval,
      });
      return {
        ...base,
        series: [
          {
            type: "line",
            smooth: 0.4,
            smoothMonotone: "x",
            symbol: "none",
            data: ys,
            lineStyle: { width: 2.5, color: primary, cap: "round" },
            areaStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: parseRgbToRgba(primary, 0.32) },
                  { offset: 1, color: parseRgbToRgba(primary, 0.04) },
                ],
              },
            },
          },
        ],
      };
    }

    if (variant === "lineSmoothDots") {
      const base = ax({
        left: 30,
        bottom: 22,
        ySplitNumber: 1,
        xLabelInterval,
      });
      return {
        ...base,
        series: [
          {
            type: "line",
            smooth: 0.45,
            symbol: "circle",
            symbolSize: 6,
            showSymbol: true,
            data: ys,
            lineStyle: { width: 2.5, color: primary, cap: "round" },
            itemStyle: {
              color: "#ffffff",
              borderColor: primary,
              borderWidth: 2,
            },
            areaStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: parseRgbToRgba(primary, 0.22) },
                  { offset: 1, color: parseRgbToRgba(primary, 0.02) },
                ],
              },
            },
          },
        ],
      };
    }

    if (variant === "dailyBars") {
      const base = ax({
        left: 28,
        bottom: 22,
        ySplitNumber: 1,
        xLabelInterval,
        boundaryGap: true,
      });
      return {
        ...base,
        series: [
          {
            type: "bar",
            data: ys,
            barMaxWidth: 14,
            itemStyle: {
              color: primary,
              borderRadius: [4, 4, 0, 0],
            },
          },
        ],
      };
    }

    if (variant === "stackedBarShare") {
      const track = ys.map((v) => Math.max(0, yCeil - v));
      const base = ax({
        left: 28,
        bottom: 22,
        ySplitNumber: 1,
        xLabelInterval,
        boundaryGap: true,
      });
      return {
        ...base,
        series: [
          {
            type: "bar",
            stack: "kpi",
            data: track,
            barMaxWidth: 14,
            itemStyle: { color: "rgba(15, 23, 42, 0.09)" },
          },
          {
            type: "bar",
            stack: "kpi",
            data: ys,
            barMaxWidth: 14,
            itemStyle: {
              color: primary,
              borderRadius: [3, 3, 0, 0],
            },
          },
        ],
      };
    }

    if (variant === "histogramBars") {
      const base = ax({
        left: 28,
        bottom: 22,
        ySplitNumber: 1,
        xLabelInterval,
        boundaryGap: true,
      });
      return {
        ...base,
        series: [
          {
            type: "bar",
            data: ys,
            barMaxWidth: 20,
            barCategoryGap: "10%",
            itemStyle: {
              color: parseRgbToRgba(primary, 0.88),
              borderColor: "rgba(15, 23, 42, 0.32)",
              borderWidth: 1,
              borderRadius: 0,
            },
          },
        ],
      };
    }

    if (variant === "miniBubble") {
      const base = ax({
        left: 30,
        bottom: 22,
        ySplitNumber: 1,
        xLabelInterval,
        boundaryGap: true,
      });
      const scatterData: [string, number][] = ys.map((y, i) => [categories[i]!, y]);
      const denom = Math.max(yMax, 1);
      return {
        ...base,
        series: [
          {
            type: "scatter",
            data: scatterData,
            symbolSize: (raw: unknown) => {
              const d = raw as [string, number];
              const y = Number(d[1]) || 0;
              const t = Math.sqrt(Math.max(0, y) / denom);
              return Math.round(6 + t * 14);
            },
            itemStyle: {
              color: parseRgbToRgba(primary, 0.92),
              borderColor: "#ffffff",
              borderWidth: 1.5,
            },
          },
        ],
      };
    }

    if (variant === "miniCandlestick") {
      const base = ax({
        left: 32,
        bottom: 22,
        ySplitNumber: 1,
        xLabelInterval,
        boundaryGap: true,
      });
      const candleData = ys.map((close, i) => {
        const open = i === 0 ? close : ys[i - 1]!;
        const lo = Math.min(open, close);
        const hi = Math.max(open, close);
        return [open, close, lo, hi];
      });
      return {
        ...base,
        series: [
          {
            type: "candlestick",
            data: candleData,
            itemStyle: {
              color: primary,
              color0: parseRgbToRgba(primary, 0.45),
              borderColor: primary,
              borderColor0: parseRgbToRgba(primary, 0.55),
            },
          },
        ],
      };
    }

    if (variant === "miniPie") {
      const sum = ys.reduce((a, b) => a + b, 0);
      const pieData =
        sum <= 0
          ? [
              {
                name: "",
                value: 1,
                itemStyle: { color: "rgba(15, 23, 42, 0.08)" },
                label: { show: false },
              },
            ]
          : ys.map((v, i) => ({
              name: categories[i]!,
              value: Math.max(0, v),
              itemStyle: {
                color: parseRgbToRgba(primary, 0.35 + ((i * 7) % 5) * 0.11),
              },
            }));
      return {
        animation: false,
        tooltip: { show: false },
        grid: { left: 2, right: 2, top: 2, bottom: 2, containLabel: false },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [
          {
            type: "pie",
            radius: ["42%", "74%"],
            center: ["50%", "50%"],
            data: pieData,
            label: { show: false },
            labelLine: { show: false },
            emphasis: { disabled: true },
            itemStyle: {
              borderColor: "#ffffff",
              borderWidth: 1,
            },
          },
        ],
      };
    }

    if (variant === "miniSankeyChain") {
      const nodes = categories.map((name) => ({ name }));
      const eps = 0.2;
      const links =
        n < 2
          ? []
          : Array.from({ length: n - 1 }, (_, i) => ({
              source: categories[i]!,
              target: categories[i + 1]!,
              value: Math.max(ys[i]!, ys[i + 1]!, eps),
            }));
      return {
        animation: false,
        tooltip: { show: false },
        series: [
          {
            type: "sankey",
            left: 2,
            right: 2,
            top: 6,
            bottom: 6,
            nodeWidth: 7,
            nodeGap: 4,
            layoutIterations: 24,
            data: nodes,
            links,
            orient: "horizontal",
            lineStyle: { color: parseRgbToRgba(primary, 0.4), curveness: 0.32 },
            itemStyle: { color: primary, borderColor: "#ffffff", borderWidth: 1 },
            label: { show: false },
            emphasis: { focus: "none" },
          },
        ],
      };
    }

    if (variant === "miniGraphRing") {
      const gNodes = categories.map((name, i) => ({
        id: String(i),
        name,
        value: ys[i],
        symbolSize: Math.round(7 + (ys[i]! / Math.max(yCeil, 1)) * 9),
        itemStyle: { color: primary, borderColor: "#ffffff", borderWidth: 1 },
      }));
      const gLinks =
        n < 2
          ? []
          : Array.from({ length: n - 1 }, (_, i) => {
              const a = Math.max(ys[i]!, ys[i + 1]!, 0);
              const w = 1 + (a / Math.max(yCeil, 1)) * 4;
              return {
                source: String(i),
                target: String(i + 1),
                value: Math.max(a, 0.15),
                lineStyle: { width: w, color: parseRgbToRgba(primary, 0.55) },
              };
            });
      return {
        animation: false,
        tooltip: { show: false },
        series: [
          {
            type: "graph",
            layout: "circular",
            circular: { rotateLabel: false },
            roam: false,
            data: gNodes,
            links: gLinks,
            label: { show: false },
            lineStyle: { curveness: 0.18 },
            emphasis: { focus: "none", disabled: true },
          },
        ],
      };
    }

    if (variant === "miniComboBarLine") {
      const base = ax({
        left: 30,
        bottom: 22,
        ySplitNumber: 1,
        xLabelInterval,
        boundaryGap: true,
      });
      return {
        ...base,
        series: [
          {
            type: "bar",
            data: ys,
            barMaxWidth: 11,
            z: 1,
            itemStyle: { color: parseRgbToRgba(primary, 0.26) },
            emphasis: { disabled: true },
          },
          {
            type: "line",
            data: ys,
            smooth: 0.28,
            symbol: "circle",
            symbolSize: 5,
            showSymbol: n <= 12,
            z: 2,
            lineStyle: { width: 2.25, color: primary },
            itemStyle: { color: "#ffffff", borderColor: primary, borderWidth: 1.5 },
            emphasis: { disabled: true },
          },
        ],
      };
    }

    if (variant === "miniTreemapDays") {
      const sum = ys.reduce((a, b) => a + b, 0);
      const treeData =
        sum <= 0
          ? [{ name: "", value: 1, itemStyle: { color: "rgba(15, 23, 42, 0.08)" }, label: { show: false } }]
          : ys.map((v, i) => ({
              name: categories[i]!,
              value: Math.max(v, 0.01),
              itemStyle: {
                color: parseRgbToRgba(primary, 0.32 + ((i * 3) % 5) * 0.1),
                borderColor: "#ffffff",
                borderWidth: 1,
              },
            }));
      return {
        animation: false,
        tooltip: { show: false },
        series: [
          {
            type: "treemap",
            roam: false,
            breadcrumb: { show: false },
            nodeClick: false,
            width: "100%",
            height: "100%",
            left: 4,
            top: 6,
            right: 4,
            bottom: 6,
            label: { show: false },
            itemStyle: { borderColor: "#ffffff", borderWidth: 1, gapWidth: 1 },
            data: treeData,
            emphasis: { disabled: true },
          },
        ],
      };
    }

    if (variant === "miniDashedTrend") {
      const base = ax({
        left: 30,
        bottom: 22,
        ySplitNumber: 1,
        xLabelInterval,
        boundaryGap: false,
      });
      return {
        ...base,
        series: [
          {
            type: "line",
            data: ys,
            smooth: 0.35,
            smoothMonotone: "x",
            symbol: "none",
            sampling: "none",
            lineStyle: {
              width: 2.75,
              color: primary,
              type: "dashed",
            },
            emphasis: { disabled: true },
          },
        ],
      };
    }

    if (variant === "miniPolarBars") {
      const axisMuted = "rgba(15, 23, 42, 0.35)";
      const labelMuted = "rgba(15, 23, 42, 0.72)";
      return {
        animation: false,
        tooltip: { show: false },
        polar: { radius: [10, "88%"], center: ["50%", "52%"] },
        angleAxis: {
          type: "category",
          data: categories,
          clockwise: true,
          startAngle: 90,
          axisLine: { lineStyle: { color: axisMuted } },
          axisTick: { show: false },
          axisLabel: {
            color: labelMuted,
            fontSize: 9,
            fontWeight: 600,
            interval: xLabelInterval,
            ...(compact ? { hideOverlap: true } : {}),
          },
        },
        radiusAxis: {
          min: 0,
          max: yCeil,
          splitNumber: 1,
          axisLine: { show: true, lineStyle: { color: axisMuted } },
          splitLine: { lineStyle: { color: "rgba(15, 23, 42, 0.07)" } },
          axisLabel: { color: labelMuted, fontSize: 9, fontWeight: 600 },
        },
        series: [
          {
            type: "bar",
            coordinateSystem: "polar",
            data: ys,
            itemStyle: {
              color: parseRgbToRgba(primary, 0.82),
              borderColor: "#ffffff",
              borderWidth: 1,
              borderRadius: 2,
            },
            emphasis: { disabled: true },
          },
        ],
      };
    }

    if (variant === "miniScatter") {
      const base = ax({
        left: 30,
        bottom: 22,
        ySplitNumber: 1,
        xLabelInterval,
        boundaryGap: true,
      });
      const scatterData: [string, number][] = ys.map((y, i) => [categories[i]!, y]);
      return {
        ...base,
        series: [
          {
            type: "scatter",
            data: scatterData,
            symbolSize: 8,
            itemStyle: {
              color: primary,
              borderColor: "#ffffff",
              borderWidth: 1.5,
            },
          },
        ],
      };
    }

    // cartesianDropLines — thick smooth curve + dashed guides (Total leads)
    const axisMuted = compact ? "rgba(15, 23, 42, 0.22)" : "rgba(15, 23, 42, 0.35)";
    const labelMuted = "rgba(15, 23, 42, 0.72)";
    const gridLight = compact ? "rgba(100, 70, 40, 0.09)" : "rgba(15, 23, 42, 0.07)";
    const markLineData: Array<
      [{ coord: (string | number)[]; symbol?: string }, { coord: (string | number)[]; symbol?: string }]
    > = [];
    const x0 = categories[0]!;
    for (let i = 0; i < n; i++) {
      const xi = categories[i]!;
      const y = ys[i]!;
      markLineData.push([{ coord: [xi, y], symbol: "none" }, { coord: [xi, 0], symbol: "none" }]);
      if (i > 0) {
        markLineData.push([{ coord: [xi, y], symbol: "none" }, { coord: [x0, y], symbol: "none" }]);
      }
    }

    return {
      animation: false,
      grid: compact
        ? { left: 22, right: 4, top: 4, bottom: 16, containLabel: false }
        : { left: 32, right: 6, top: 8, bottom: 22 },
      tooltip: { show: false },
      xAxis: {
        type: "category",
        data: categories,
        boundaryGap: false,
        axisLine: { show: true, lineStyle: { color: axisMuted, width: compact ? 1 : 2 } },
        axisTick: { alignWithLabel: true, lineStyle: { color: axisMuted }, length: compact ? 3 : undefined },
        axisLabel: {
          color: labelMuted,
          fontWeight: compact ? 600 : 700,
          fontSize: compact ? 8 : 10,
          interval: xLabelInterval,
          ...(compact
            ? {
                formatter: (val: string) => formatKpiCardXAxisCategory(val),
                hideOverlap: true,
              }
            : {}),
        },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: yCeil,
        splitNumber: compact ? 2 : 1,
        axisLine: { show: true, lineStyle: { color: axisMuted, width: compact ? 1 : 2 } },
        splitLine: {
          lineStyle: {
            color: gridLight,
            type: compact ? "dotted" : "solid",
          },
        },
        axisLabel: {
          color: labelMuted,
          fontWeight: compact ? 600 : 700,
          fontSize: compact ? 8 : 10,
          ...(compact ? { formatter: (val: number) => formatKpiCardYAxisValue(val) } : {}),
        },
      },
      series: [
        {
          type: "line",
          smooth: 0.42,
          symbol: "none",
          data: ys,
          lineStyle: { width: 3.5, color: primary, cap: "round", join: "round" },
          z: 3,
          markLine: {
            silent: true,
            symbol: "none",
            z: 1,
            lineStyle: { type: "dashed", color: dashGuide, width: 1 },
            data: markLineData,
          },
        },
      ],
    };
  }, [variant, ys, categories, n, yCeil, primaryRgb, xLabelInterval, compact]);

  return (
    <div
      role="img"
      aria-label={`${title} trend`}
      style={{ width: "100%", height, minWidth: 0 }}
    >
      <ReactECharts
        option={option}
        style={{ height: "100%", width: "100%" }}
        opts={{ renderer: "canvas" }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
