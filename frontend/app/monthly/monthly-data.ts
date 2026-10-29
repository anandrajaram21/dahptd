import { cutoffs, DEFAULT_CUTOFF, type Metrics } from "../forecast-data";

export type Summary = Metrics & {
  mean_error: number | null;
  mean_forecast: number | null;
  mean_actual: number | null;
};

export type DaySummary = Summary & {
  delivery_date: string;
  publish_time: string | null;
};

export type MonthlyData = {
  cutoff: string;
  summary: Summary;
  days: DaySummary[];
  time_of_day: (Summary & { time: string })[];
  cutoffs: (Summary & { cutoff: string })[];
  snapshot: { retrieved_at: string };
};

export function readCutoff(params: Pick<URLSearchParams, "get">) {
  const cutoff = params.get("cutoff") ?? "";
  return cutoffs.includes(cutoff) ? cutoff : DEFAULT_CUTOFF;
}

export const dailyHref = (date: string, cutoff: string) =>
  `/?${new URLSearchParams({ date, cutoff, actuals: "1" })}`;

export const share = (part: number, whole: number) =>
  whole ? Math.round((100 * part) / whole) : 0;

export const percent = (value: number | null, digits = 1) =>
  value === null ? "—" : `${value.toFixed(digits)}%`;

/** Best and worst days by accuracy, ignoring days with no comparison. */
export function extremes(days: DaySummary[]) {
  const scored = days.filter((day) => day.accuracy !== null);
  const byAccuracy = [...scored].sort(
    (a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0),
  );
  return { best: byAccuracy[0], worst: byAccuracy.at(-1) };
}

/**
 * Calendar rows for a month, Monday first. Cells before the first day are
 * null so the grid lines up with weekdays.
 */
export function calendarWeeks<T extends { delivery_date: string }>(days: T[]) {
  if (!days.length) return [];
  const first = new Date(`${days[0].delivery_date}T00:00:00Z`).getUTCDay();
  const cells: (T | null)[] = [
    ...Array<null>((first + 6) % 7).fill(null),
    ...days,
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) =>
    cells.slice(week * 7, week * 7 + 7),
  );
}
