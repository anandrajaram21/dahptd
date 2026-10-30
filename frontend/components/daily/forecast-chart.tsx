"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_TICK,
  GRID_STROKE,
  chartConfig,
  depth,
  useMotion,
} from "@/components/chart-theme";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { errorDirection, type Point } from "@/lib/daily";
import { intervalLabel, number, signed, timeLabel } from "@/lib/format";

const SYNC = "delivery-day";
const Y_AXIS_WIDTH = 64;
const MARGIN = { top: 8, right: 12, bottom: 0, left: 0 };

type Row = Point & { label: string; gap: [number, number] | null };

function rows(points: Point[]): Row[] {
  return points.map((point) => ({
    ...point,
    label: timeLabel(point.start_time),
    // The band between forecast and actual, drawn as a contour.
    gap:
      point.forecast === null || point.actual === null
        ? null
        : [
            Math.min(point.forecast, point.actual),
            Math.max(point.forecast, point.actual),
          ],
  }));
}

// Track pointer presence so a synced chart shows its cursor but no tooltip.
function useHover() {
  const [hovered, setHovered] = useState(false);
  return {
    hovered,
    handlers: {
      onPointerEnter: () => setHovered(true),
      onPointerLeave: () => setHovered(false),
    },
  };
}

function xAxis(rows: Row[], orientation: "top" | "bottom" = "bottom") {
  return (
    <XAxis
      dataKey="label"
      orientation={orientation}
      // Band scale in both charts keeps half-hours aligned with the bars.
      scale="band"
      // One tick every three hours, like grid numbers on a sheet's edge.
      ticks={rows.filter((_, index) => index % 6 === 0).map((row) => row.label)}
      tick={
        orientation === "top"
          ? { fill: "var(--grid-ink)", fontSize: 12, fontWeight: 700 }
          : AXIS_TICK
      }
      tickLine={false}
      axisLine={false}
      tickMargin={8}
    />
  );
}

function IntervalTooltip({
  active,
  payload,
  actuals,
  hovered,
}: {
  active?: boolean;
  payload?: { payload?: Row }[];
  actuals: boolean;
  hovered: boolean;
}) {
  const point = payload?.[0]?.payload;
  // Synced charts share the cursor; only the hovered one shows details.
  if (!active || !point || !hovered) return null;
  return (
    <div className="grid min-w-52 gap-1.5 rounded-[var(--radius)] border-[1.5px] border-frame bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-[0_6px_18px_-6px_rgb(0_0_0/0.25)]">
      <p className="font-bold tabular-nums">
        {intervalLabel(point.start_time, 30)} GMT
      </p>
      <TooltipRow color={chartConfig.forecast.color} label="Forecast">
        {number(point.forecast)} MW
      </TooltipRow>
      {point.forecast !== null && (
        <p className="text-muted-foreground tabular-nums">
          Hourly value for {intervalLabel(point.forecast_hour, 60)}
        </p>
      )}
      {actuals && (
        <>
          <TooltipRow color={chartConfig.actual.color} label="Actual">
            {number(point.actual)} MW
          </TooltipRow>
          {point.error !== null && (
            <div className="mt-1 border-t pt-1.5">
              <TooltipRow
                color={
                  point.error > 0
                    ? chartConfig.over.color
                    : chartConfig.under.color
                }
                label="Error"
              >
                {signed(point.error)} MW
              </TooltipRow>
              <p className="text-muted-foreground">
                {errorDirection(point.error)}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TooltipRow({
  color,
  label,
  children,
}: {
  color: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="size-2.5 shrink-0 rounded-[2px]"
        style={{ background: color }}
      />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium text-foreground tabular-nums">
        {children}
      </span>
    </div>
  );
}

export function ForecastChart({
  points,
  actuals,
}: {
  points: Point[];
  actuals: boolean;
}) {
  const data = rows(points);
  const { hovered, handlers } = useHover();
  const motion = useMotion();
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[340px] w-full sm:h-[400px]"
      {...handlers}
    >
      <ComposedChart
        data={data}
        syncId={SYNC}
        margin={{ ...MARGIN, top: 4 }}
        barCategoryGap={0}
        accessibilityLayer
      >
        <CartesianGrid stroke={GRID_STROKE} />
        {xAxis(data, "top")}
        <YAxis
          width={Y_AXIS_WIDTH}
          domain={[0, "auto"]}
          tick={AXIS_TICK}
          tickFormatter={(value: number) => number(value)}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          isAnimationActive={false}
          cursor={{ stroke: "var(--frame)", strokeDasharray: "3 4" }}
          content={<IntervalTooltip actuals={actuals} hovered={hovered} />}
        />
        {/* Contour bands: each half-hour's miss, shaded by its depth step. */}
        {actuals && (
          <Bar
            dataKey="gap"
            isAnimationActive={motion}
            animationDuration={700}
            animationEasing="ease-out"
          >
            {data.map((row) => (
              <Cell
                key={row.start_time}
                fill={row.error ? depth(row.error) : "transparent"}
                // A hairline of the same colour closes anti-aliasing seams.
                stroke={row.error ? depth(row.error) : "transparent"}
                strokeWidth={0.75}
              />
            ))}
          </Bar>
        )}
        {/* Step lines hold each value across its whole interval. */}
        {actuals && (
          <Line
            dataKey="actual"
            type="step"
            stroke="var(--color-actual)"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        )}
        <Line
          dataKey="forecast"
          type="step"
          stroke="var(--color-forecast)"
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 5 }}
          connectNulls={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}

export function ErrorChart({ points }: { points: Point[] }) {
  const data = rows(points);
  const { hovered, handlers } = useHover();
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-40 w-full"
      {...handlers}
    >
      <BarChart
        data={data}
        syncId={SYNC}
        margin={MARGIN}
        barCategoryGap={1}
        accessibilityLayer
      >
        <CartesianGrid stroke={GRID_STROKE} />
        {xAxis(data)}
        <YAxis
          width={Y_AXIS_WIDTH}
          tick={AXIS_TICK}
          tickFormatter={(value: number) => signed(value)}
          tickLine={false}
          axisLine={false}
        />
        <ReferenceLine y={0} stroke="var(--frame)" strokeWidth={1.5} />
        <ChartTooltip
          isAnimationActive={false}
          cursor={{ fill: "var(--muted)", opacity: 0.7 }}
          content={<IntervalTooltip actuals hovered={hovered} />}
        />
        <Bar dataKey="error" radius={2} isAnimationActive={false}>
          {data.map((row) => (
            <Cell
              key={row.start_time}
              fill={
                (row.error ?? 0) > 0
                  ? "var(--color-over)"
                  : "var(--color-under)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
