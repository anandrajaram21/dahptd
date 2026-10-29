import { describe, expect, test } from "bun:test";
import {
  analysisCsv,
  biasDescription,
  differenceLabel,
  deliveryDate,
  readSettings,
  settingsQuery,
  type DashboardData,
  type Metrics,
} from "../app/dashboard-data";

const metrics: Metrics = {
  mae: 20,
  bias: 10,
  rmse: 30,
  matched_hours: 2,
  expected_hours: 24,
  forecast_hours: 3,
  actual_hours: 2,
  overestimated_hours: 1,
  underestimated_hours: 1,
  equal_hours: 0,
};
const data: DashboardData = {
  decision_date: "2026-01-31",
  delivery_date: "2026-02-01",
  decision_at: "2026-01-31T09:45:00+00:00",
  metrics,
  month_metrics: metrics,
  points: [
    {
      start_time: "2026-02-01T00:00:00+00:00",
      publish_time: "2026-01-31T09:30:00+00:00",
      forecast: 110,
      actual: 100,
      error: 10,
    },
    {
      start_time: "2026-02-01T01:00:00+00:00",
      publish_time: null,
      forecast: null,
      actual: 90,
      error: null,
    },
  ],
  forecast_summary: {
    available_hours: 1,
    expected_hours: 24,
    mean: 110,
    lowest: null,
    highest: null,
    publication_times: [],
  },
  month_days: [
    { decision_date: "2026-01-31", delivery_date: "2026-02-01", metrics },
  ],
  month_window: {
    decision_start: "2026-01-01",
    decision_end: "2026-01-31",
    delivery_start: "2026-01-02",
    delivery_end: "2026-02-01",
  },
  snapshot: {
    retrieved_at: "2026-10-28T17:02:00Z",
    files: {
      "forecasts.json.gz": { dataset: "WINDFOR", sha256: "forecast-hash" },
      "actuals.json.gz": { dataset: "FUELHH", sha256: "actual-hash" },
    },
  },
};

describe("shareable analysis settings", () => {
  test("January decisions include February delivery", () => {
    expect(deliveryDate("2026-01-01")).toBe("2026-01-02");
    expect(deliveryDate("2026-01-31")).toBe("2026-02-01");
  });
  test("uses an explicit pre-close example, not 10:00", () => {
    const settings = readSettings(new URLSearchParams());
    expect(settings.scenario).toBe("nord");
    expect(settings.cutoff).toBe("09:45");
    expect(settings.view).toBe("forecast");
  });
  test("round trips date, scenario, time, view and scope", () => {
    const query = new URLSearchParams(
      "date=2026-01-31&scenario=epex&cutoff=09:15&view=accuracy&period=day",
    );
    const settings = readSettings(query);
    expect(readSettings(new URLSearchParams(settingsQuery(settings)))).toEqual(
      settings,
    );
    expect(settings.date).toBe("2026-01-31");
    expect(settings.period).toBe("day");
  });
  test("invalid dates, times and views cannot reach the API", () => {
    const settings = readSettings(
      new URLSearchParams(
        "date=2026-02-30&cutoff=25:00&view=garbage&period=garbage",
      ),
    );
    expect(settings.date).toBe("2026-01-15");
    expect(settings.cutoff).toBe("09:45");
    expect(settings.view).toBe("forecast");
    expect(settings.period).toBe("month");
  });
  test("never mislabels a custom time as a market preset", () => {
    const settings = readSettings(
      new URLSearchParams("scenario=epex&cutoff=10:00"),
    );
    expect(settings.scenario).toBe("custom");
    expect(settings.cutoff).toBe("10:00");
  });
});

describe("plain-language error interpretation", () => {
  test("positive means above actual, not better", () => {
    expect(differenceLabel(100)).toBe("100 MW above actual");
    expect(differenceLabel(-100)).toBe("100 MW below actual");
    expect(biasDescription(metrics)).toContain(
      "10 MW higher than recorded output",
    );
    expect(biasDescription({ ...metrics, bias: -10 })).toContain("10 MW lower");
  });
  test("missing errors are never zero; zero bias need not be accurate", () => {
    expect(differenceLabel(null)).toBe("Not available");
    expect(differenceLabel(0)).toBe("No difference");
    expect(biasDescription({ ...metrics, bias: 0 })).toContain(
      "Individual errors may still be large",
    );
  });
});

describe("contextual exports", () => {
  const settings = readSettings(new URLSearchParams("date=2026-01-31"));
  test("forecast export excludes actuals, errors and actuals identity", () => {
    const csv = analysisCsv(data, settings);
    expect(csv).not.toContain("actual_MW");
    expect(csv).not.toContain("error_forecast");
    expect(csv).not.toContain("actual-hash");
    expect(csv).toContain(data.decision_at);
    expect(csv).toContain("forecast-hash");
    expect(csv).toContain('"2026-02-01T01:00:00+00:00","",""');
  });
  test("day review includes unrounded signed errors and actuals", () => {
    const csv = analysisCsv(data, {
      ...settings,
      view: "accuracy",
      period: "day",
    });
    expect(csv).toContain("error_forecast_minus_actual_MW");
    expect(csv).toContain('"110","100","10"');
    expect(csv).toContain("actual-hash");
  });
  test("month export labels decision and delivery boundaries separately", () => {
    const csv = analysisCsv(data, {
      ...settings,
      view: "accuracy",
      period: "month",
    });
    expect(csv).toContain(
      '"decision_date","decision_cutoff_GMT","delivery_date"',
    );
    expect(csv).toContain('"2026-01-31","09:45","2026-02-01"');
    expect(csv).toContain("bias_forecast_minus_actual_MW");
  });
});
