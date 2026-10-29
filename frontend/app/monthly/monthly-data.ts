import { cutoffs, DEFAULT_CUTOFF, type Metrics } from "../forecast-data";
import { sameRun, type ReleaseInfo } from "../release-notice";

export type Summary = Metrics & {
  mean_error: number | null;
  mean_forecast: number | null;
  mean_actual: number | null;
};

export type DaySummary = Summary & {
  delivery_date: string;
  publish_time: string | null;
};

export type Release = { time: string; days: number };

export type MonthlyData = {
  cutoff: string;
  publications: Release[];
  summary: Summary;
  days: DaySummary[];
  time_of_day: (Summary & { time: string })[];
  cutoffs: (Summary & { cutoff: string; publications: Release[] })[];
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

/** "15:30", or "11:30 (12:25 on 1 day)" when a day used an irregular release. */
export function releaseLabel(releases: Release[]) {
  if (!releases.length) return null;
  const [main, ...others] = [...releases].sort((a, b) => b.days - a.days);
  const extra = others
    .map((r) => `${r.time} on ${r.days} day${r.days === 1 ? "" : "s"}`)
    .join(", ");
  return extra ? `${main.time} (${extra})` : main.time;
}

/**
 * Which release a cutoff uses, the run of neighbouring cutoffs that pick
 * exactly the same forecasts, and the regular publication schedule.
 */
export function releaseInfo(
  rows: MonthlyData["cutoffs"],
  selected: string,
): ReleaseInfo {
  const row = rows.find((r) => r.cutoff === selected);
  const counts = new Map<string, number>();
  for (const r of rows)
    for (const release of r.publications)
      counts.set(
        release.time,
        Math.max(counts.get(release.time) ?? 0, release.days),
      );
  // Regular releases appear on most days; one-off releases are left out.
  const schedule = [...counts]
    .filter(([, days]) => days > 15)
    .map(([time]) => time)
    .sort();
  return {
    release: row ? releaseLabel(row.publications) : null,
    ...sameRun(rows, selected, (r) => JSON.stringify(r.publications)),
    schedule,
  };
}
