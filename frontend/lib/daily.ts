import { DEFAULT_CUTOFF, sameRun, type ReleaseInfo } from "./cutoffs";
import { timeLabel } from "./format";

export type Metrics = {
  mae: number | null;
  rmse: number | null;
  accuracy: number | null;
  matched_intervals: number;
  expected_intervals: number;
  overestimated_intervals: number;
  underestimated_intervals: number;
  equal_intervals: number;
};

export type Point = {
  start_time: string;
  forecast_hour: string;
  forecast: number | null;
  actual: number | null;
  error: number | null;
};

export type ForecastData = {
  delivery_date: string;
  decision_date: string;
  decision_at: string;
  publish_time: string | null;
  points: Point[];
  cutoff_releases: { cutoff: string; publish_time: string | null }[];
  schedule: string[];
  metrics: Metrics;
  snapshot: {
    retrieved_at: string;
    files: Record<string, { dataset: string; sha256: string }>;
  };
};

export type Settings = {
  date: string;
  cutoff: string;
  actuals: boolean;
};

export const FIRST_DATE = "2026-01-01";
export const LAST_DATE = "2026-02-01";
export const DEFAULT_DATE = "2026-01-16";

const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  value >= FIRST_DATE &&
  value <= LAST_DATE;

export function readSettings(params: Pick<URLSearchParams, "get">): Settings {
  const date = params.get("date") ?? "";
  const cutoff = params.get("cutoff") ?? "";
  return {
    date: validDate(date) ? date : DEFAULT_DATE,
    cutoff: /^([01]\d|2[0-3]):[0-5]\d$/.test(cutoff) ? cutoff : DEFAULT_CUTOFF,
    actuals: params.get("actuals") === "1",
  };
}

export function settingsQuery({ date, cutoff, actuals }: Settings) {
  const query = new URLSearchParams({ date, cutoff });
  if (actuals) query.set("actuals", "1");
  return query.toString();
}

export function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// The calendar works with local dates; the API uses ISO date strings.
export const toLocalDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
export const fromLocalDate = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

export function errorDirection(error: number | null) {
  if (error === null) return null;
  if (error === 0) return "Forecast matched actual";
  return error > 0 ? "Forecast too high" : "Forecast too low";
}

/** The forecast this day's cutoff uses and the cutoffs that share it. */
export function dailyReleaseInfo(
  data: Pick<ForecastData, "publish_time" | "cutoff_releases" | "schedule">,
  cutoff: string,
): ReleaseInfo {
  return {
    release: data.publish_time ? timeLabel(data.publish_time) : null,
    ...sameRun(data.cutoff_releases, cutoff, (r) => String(r.publish_time)),
    schedule: data.schedule,
  };
}
