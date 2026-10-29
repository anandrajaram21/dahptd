export type Metrics = {
  mae: number | null;
  bias: number | null;
  rmse: number | null;
  matched_hours: number;
  expected_hours: number;
  forecast_hours: number;
  actual_hours: number;
  overestimated_hours: number;
  underestimated_hours: number;
  equal_hours: number;
};

export type Point = {
  start_time: string;
  publish_time: string | null;
  forecast: number | null;
  actual: number | null;
  error: number | null;
};

export type DayReview = {
  decision_date: string;
  delivery_date: string;
  metrics: Metrics;
};

export type DashboardData = DayReview & {
  decision_at: string;
  points: Point[];
  forecast_summary: {
    available_hours: number;
    expected_hours: number;
    mean: number | null;
    lowest: Pick<Point, "start_time" | "forecast"> | null;
    highest: Pick<Point, "start_time" | "forecast"> | null;
    publication_times: string[];
  };
  month_metrics: Metrics;
  month_days: DayReview[];
  month_window: {
    decision_start: string;
    decision_end: string;
    delivery_start: string;
    delivery_end: string;
  };
  snapshot: {
    retrieved_at: string;
    files: Record<string, { dataset: string; sha256: string }>;
  };
};

export const scenarios = {
  nord: { label: "Nord Pool hourly", cutoff: "09:45", closes: "09:50" },
  epex: { label: "EPEX hourly", cutoff: "09:15", closes: "09:20" },
} as const;

export type Settings = {
  date: string;
  cutoff: string;
  scenario: keyof typeof scenarios | "custom";
  view: "forecast" | "accuracy";
  period: "day" | "month";
};

export const dates = Array.from(
  { length: 31 },
  (_, i) => `2026-01-${String(i + 1).padStart(2, "0")}`,
);
export const validTime = (value: string) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function readSettings(params: Pick<URLSearchParams, "get">): Settings {
  const selectedScenario = params.get("scenario");
  let scenario: Settings["scenario"] =
    selectedScenario === "epex" || selectedScenario === "custom"
      ? selectedScenario
      : "nord";
  const requestedTime = params.get("cutoff");
  const cutoff =
    requestedTime && validTime(requestedTime)
      ? requestedTime
      : scenario === "custom"
        ? scenarios.nord.cutoff
        : scenarios[scenario].cutoff;
  // Never attribute a custom cutoff to a named planning preset.
  if (scenario !== "custom" && cutoff !== scenarios[scenario].cutoff)
    scenario = "custom";
  const date = params.get("date") ?? "";
  return {
    date: dates.includes(date) ? date : "2026-01-15",
    cutoff,
    scenario,
    view: params.get("view") === "accuracy" ? "accuracy" : "forecast",
    period: params.get("period") === "day" ? "day" : "month",
  };
}

export function settingsQuery(settings: Settings) {
  return new URLSearchParams(settings).toString();
}

const formatter = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
export const number = (value: number | null) =>
  value === null ? "—" : formatter.format(value);
export const dayLabel = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
export const shortDayLabel = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  });
export const deliveryDate = (decisionDate: string) => {
  const date = new Date(`${decisionDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};
export const hourLabel = (value: string) =>
  new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
export const publicationLabel = (value: string) =>
  `${dayLabel(value)}, ${hourLabel(value)} GMT`;

export function differenceLabel(error: number | null) {
  if (error === null) return "Not available";
  if (error === 0) return "No difference";
  return `${number(Math.abs(error))} MW ${error > 0 ? "above" : "below"} actual`;
}

export function biasDescription(metrics: Metrics) {
  if (metrics.bias === null)
    return "Not enough matched data to calculate a difference.";
  if (metrics.bias === 0)
    return "Overestimates and underestimates balanced out on average. Individual errors may still be large.";
  return `Forecasts were ${number(Math.abs(metrics.bias))} MW ${metrics.bias > 0 ? "higher" : "lower"} than recorded output on average across ${metrics.matched_hours} matched hours.`;
}

// Every exported row carries its decision context and snapshot identity.
// Forecast-only exports intentionally omit actuals and retrospective errors.
export function analysisCsv(data: DashboardData, settings: Settings) {
  const month = settings.view === "accuracy" && settings.period === "month";
  const review = settings.view === "accuracy";
  const identity = [
    data.snapshot.retrieved_at,
    data.snapshot.files["forecasts.json.gz"].sha256,
    ...(review ? [data.snapshot.files["actuals.json.gz"].sha256] : []),
  ];
  const identityHeaders = [
    "snapshot_retrieved_at",
    "WINDFOR_sha256",
    ...(review ? ["FUELHH_sha256"] : []),
  ];
  const headers = month
    ? [
        "decision_date",
        "decision_cutoff_GMT",
        "delivery_date",
        "MAE_MW",
        "bias_forecast_minus_actual_MW",
        "RMSE_MW",
        "matched_hours",
        "expected_hours",
        ...identityHeaders,
      ]
    : [
        "decision_at",
        "delivery_start",
        "forecast_publish_time",
        "forecast_MW",
        ...(review ? ["actual_MW", "error_forecast_minus_actual_MW"] : []),
        ...identityHeaders,
      ];
  const rows = month
    ? data.month_days.map((day) => [
        day.decision_date,
        settings.cutoff,
        day.delivery_date,
        day.metrics.mae,
        day.metrics.bias,
        day.metrics.rmse,
        day.metrics.matched_hours,
        day.metrics.expected_hours,
        ...identity,
      ])
    : data.points.map((point) => [
        data.decision_at,
        point.start_time,
        point.publish_time,
        point.forecast,
        ...(review ? [point.actual, point.error] : []),
        ...identity,
      ]);
  return [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\r\n");
}
