"use client";

import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { chartConfig } from "../forecast-chart";
import { dayLabel, number, signed } from "../forecast-data";
import {
  dailyHref,
  percent,
  share,
  type DaySummary,
  type MonthlyData,
  type Summary,
} from "./monthly-data";

const Y_AXIS_WIDTH = 64;
const MARGIN = { top: 8, right: 12, bottom: 0, left: 0 };

type TooltipProps<T> = {
  active?: boolean;
  payload?: readonly { payload?: T }[];
};

function TooltipBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-56 gap-1.5 rounded-lg border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-md">
      <p className="font-medium tabular-nums">{title}</p>
      {children}
    </div>
  );
}

function Row({
  color,
  label,
  children,
}: {
  color?: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {color && (
        <span
          className="size-2.5 shrink-0 rounded-[2px]"
          style={{ background: color }}
        />
      )}
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium text-foreground tabular-nums">
        {children}
      </span>
    </div>
  );
}

function SummaryRows({ summary }: { summary: Summary }) {
  return (
    <div className="mt-1 grid gap-1.5 border-t pt-1.5">
      <Row label="Accuracy">{percent(summary.accuracy)}</Row>
      <Row label="MAE">{number(summary.mae)} MW</Row>
      <Row label="Too high / too low">
        {summary.overestimated_intervals} / {summary.underestimated_intervals}
      </Row>
    </div>
  );
}

const dayNumber = (date: string) => String(Number(date.slice(8, 10)));

/** Daily average forecast vs actual across the month. Click a day to open it. */
export function DailyChart({
  days,
  cutoff,
}: {
  days: DaySummary[];
  cutoff: string;
}) {
  const router = useRouter();
  const data = days.map((day) => ({
    ...day,
    label: dayNumber(day.delivery_date),
  }));
  // Mondays, so the axis reads as weeks.
  const ticks = data
    .filter((d) => new Date(`${d.delivery_date}T00:00:00Z`).getUTCDay() === 1)
    .map((d) => d.label);
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[300px] w-full cursor-pointer"
    >
      <ComposedChart
        data={data}
        margin={MARGIN}
        accessibilityLayer
        onClick={(state) => {
          const day = data.find((d) => d.label === String(state?.activeLabel));
          if (day) router.push(dailyHref(day.delivery_date, cutoff));
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          ticks={ticks}
          tickFormatter={(label: string) => `${label} Jan`}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
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
          content={({ active, payload }: TooltipProps<DaySummary>) => {
            const day = payload?.[0]?.payload;
            if (!active || !day) return null;
            return (
              <TooltipBox title={dayLabel(day.delivery_date)}>
                <Row color={chartConfig.forecast.color} label="Avg forecast">
                  {number(day.mean_forecast)} MW
                </Row>
                <Row color={chartConfig.actual.color} label="Avg actual">
                  {number(day.mean_actual)} MW
                </Row>
                <SummaryRows summary={day} />
                <p className="text-muted-foreground">Click to open this day</p>
              </TooltipBox>
            );
          }}
        />
        <Line
          dataKey="mean_forecast"
          stroke="var(--color-forecast)"
          strokeWidth={2}
          dot={{ r: 2.5, fill: "var(--color-forecast)" }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
        <Line
          dataKey="mean_actual"
          stroke="var(--color-actual)"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={{ r: 2.5, fill: "var(--color-actual)", strokeDasharray: "" }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}

/** Average signed error for each half-hour of the day across the month. */
export function TimeOfDayChart({ rows }: { rows: MonthlyData["time_of_day"] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
      <BarChart
        data={rows}
        margin={MARGIN}
        barCategoryGap={1}
        accessibilityLayer
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="time"
          ticks={rows.filter((_, i) => i % 6 === 0).map((row) => row.time)}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
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
          content={({
            active,
            payload,
          }: TooltipProps<MonthlyData["time_of_day"][number]>) => {
            const row = payload?.[0]?.payload;
            if (!active || !row || row.mean_error === null) return null;
            return (
              <TooltipBox title={`${row.time} GMT · all January days`}>
                <Row
                  color={
                    row.mean_error > 0
                      ? chartConfig.over.color
                      : chartConfig.under.color
                  }
                  label="Avg error"
                >
                  {signed(row.mean_error)} MW
                </Row>
                <Row label="Avg forecast">{number(row.mean_forecast)} MW</Row>
                <Row label="Avg actual">{number(row.mean_actual)} MW</Row>
                <p className="text-muted-foreground">
                  Too high on {row.overestimated_intervals} of{" "}
                  {row.matched_intervals} days
                </p>
              </TooltipBox>
            );
          }}
        />
        <Bar dataKey="mean_error" radius={2} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell
              key={row.time}
              fill={
                (row.mean_error ?? 0) > 0
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

/** Month accuracy for every whole-hour cutoff. Click a point to select it. */
export function CutoffChart({
  rows,
  selected,
  onSelect,
}: {
  rows: MonthlyData["cutoffs"];
  selected: string;
  onSelect: (cutoff: string) => void;
}) {
  const values = rows.flatMap((row) =>
    row.accuracy === null ? [] : [row.accuracy],
  );
  const domain = [
    Math.floor(Math.min(...values)) - 1,
    Math.ceil(Math.max(...values)) + 1,
  ];
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-52 w-full cursor-pointer"
    >
      <LineChart
        data={rows}
        margin={{ ...MARGIN, top: 16 }}
        accessibilityLayer
        onClick={(state) => {
          if (state?.activeLabel) onSelect(String(state.activeLabel));
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="cutoff"
          ticks={rows.filter((_, i) => i % 3 === 0).map((row) => row.cutoff)}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          width={Y_AXIS_WIDTH}
          domain={domain}
          allowDecimals={false}
          tickFormatter={(value: number) => `${value}%`}
          tickLine={false}
          axisLine={false}
        />
        <ReferenceLine
          x={selected}
          stroke="var(--color-forecast)"
          strokeDasharray="3 4"
        />
        <ChartTooltip
          isAnimationActive={false}
          cursor={{ strokeDasharray: "3 4" }}
          content={({
            active,
            payload,
          }: TooltipProps<MonthlyData["cutoffs"][number]>) => {
            const row = payload?.[0]?.payload;
            if (!active || !row) return null;
            return (
              <TooltipBox title={`Cutoff ${row.cutoff} GMT`}>
                <SummaryRows summary={row} />
                <Row label="Too high">
                  {share(row.overestimated_intervals, row.matched_intervals)}%
                  of half-hours
                </Row>
                {row.matched_intervals < row.expected_intervals && (
                  <p className="text-muted-foreground">
                    {row.matched_intervals} of {row.expected_intervals}{" "}
                    half-hours covered
                  </p>
                )}
                {row.cutoff !== selected && (
                  <p className="text-muted-foreground">Click to select</p>
                )}
              </TooltipBox>
            );
          }}
        />
        <Line
          dataKey="accuracy"
          type="stepAfter"
          stroke="var(--color-forecast)"
          strokeWidth={2}
          isAnimationActive={false}
          dot={(props: {
            cx?: number;
            cy?: number;
            payload?: { cutoff: string };
          }) => {
            const active = props.payload?.cutoff === selected;
            return (
              <circle
                key={props.payload?.cutoff}
                cx={props.cx}
                cy={props.cy}
                r={active ? 6 : 3}
                fill={active ? "var(--color-forecast)" : "var(--card)"}
                stroke="var(--color-forecast)"
                strokeWidth={2}
              />
            );
          }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
