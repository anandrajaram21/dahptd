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
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  errorDirection,
  intervalLabel,
  number,
  signed,
  timeLabel,
  type Point,
} from "./forecast-data";

// Validated with the dataviz palette checker against the dark surface.
export const chartConfig = {
  forecast: { label: "Forecast", color: "#3987e5" },
  actual: { label: "Actual", color: "#c3c2b7" },
  over: { label: "Forecast too high", color: "#d55181" },
  under: { label: "Forecast too low", color: "#c98500" },
} satisfies ChartConfig;

const SYNC = "delivery-day";
const Y_AXIS_WIDTH = 64;
const MARGIN = { top: 8, right: 12, bottom: 0, left: 0 };

type Row = Point & { label: string };

function rows(points: Point[]): Row[] {
  return points.map((point) => ({
    ...point,
    label: timeLabel(point.start_time),
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

function xAxis(rows: Row[]) {
  return (
    <XAxis
      dataKey="label"
      // Band scale in both charts keeps half-hours aligned with the bars.
      scale="band"
      // One tick every three hours.
      ticks={rows.filter((_, index) => index % 6 === 0).map((row) => row.label)}
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
    <div className="grid min-w-52 gap-1.5 rounded-lg border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-md">
      <p className="font-medium tabular-nums">
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
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[340px] w-full sm:h-[380px]"
      {...handlers}
    >
      <ComposedChart
        data={data}
        syncId={SYNC}
        margin={MARGIN}
        accessibilityLayer
      >
        <CartesianGrid vertical={false} />
        {xAxis(data)}
        <YAxis
          width={Y_AXIS_WIDTH}
          domain={[0, "auto"]}
          tickFormatter={(value: number) => number(value)}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          isAnimationActive={false}
          cursor={{ strokeDasharray: "3 4" }}
          content={<IntervalTooltip actuals={actuals} hovered={hovered} />}
        />
        {/* Step lines hold each value across its whole interval. */}
        <Line
          dataKey="forecast"
          type="step"
          stroke="var(--color-forecast)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls={false}
          isAnimationActive={false}
        />
        {actuals && (
          <Line
            dataKey="actual"
            type="step"
            stroke="var(--color-actual)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        )}
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
        <CartesianGrid vertical={false} />
        {xAxis(data)}
        <YAxis
          width={Y_AXIS_WIDTH}
          tickFormatter={(value: number) => signed(value)}
          tickLine={false}
          axisLine={false}
        />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" />
        <ChartTooltip
          isAnimationActive={false}
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
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
