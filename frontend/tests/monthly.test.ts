import { describe, expect, test } from "bun:test";
import {
  calendarWeeks,
  dailyHref,
  extremes,
  readCutoff,
  releaseInfo,
  releaseLabel,
  share,
  type DaySummary,
  type MonthlyData,
} from "../lib/monthly";

const day = (delivery_date: string, accuracy: number | null) =>
  ({ delivery_date, accuracy }) as DaySummary;

describe("monthly helpers", () => {
  test("reads whole-hour cutoffs and defaults to 10:00", () => {
    expect(readCutoff(new URLSearchParams("cutoff=16:00"))).toBe("16:00");
    expect(readCutoff(new URLSearchParams("cutoff=09:30"))).toBe("10:00");
    expect(readCutoff(new URLSearchParams())).toBe("10:00");
  });

  test("links a day to the daily page with actuals shown", () => {
    expect(dailyHref("2026-01-28", "10:00")).toBe(
      "/?date=2026-01-28&cutoff=10%3A00&actuals=1",
    );
  });

  test("lays January 2026 out from Monday", () => {
    const days = Array.from({ length: 31 }, (_, i) =>
      day(`2026-01-${String(i + 1).padStart(2, "0")}`, 80),
    );
    const weeks = calendarWeeks(days);
    // 1 January 2026 is a Thursday.
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0][3]?.delivery_date).toBe("2026-01-01");
    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  test("finds the best and worst days, skipping missing comparisons", () => {
    const result = extremes([
      day("2026-01-01", 70),
      day("2026-01-02", null),
      day("2026-01-03", 93.5),
      day("2026-01-04", 6.7),
    ]);
    expect(result.best?.delivery_date).toBe("2026-01-03");
    expect(result.worst?.delivery_date).toBe("2026-01-04");
    expect(share(1256, 1488)).toBe(84);
  });
});

describe("release disclaimer", () => {
  const release = (time: string, days = 31) => [{ time, days }];
  const rows = [
    ["11:00", release("09:30")],
    ["12:00", release("11:30")],
    [
      "13:00",
      [
        { time: "11:30", days: 30 },
        { time: "12:25", days: 1 },
      ],
    ],
    [
      "14:00",
      [
        { time: "11:30", days: 30 },
        { time: "12:25", days: 1 },
      ],
    ],
    [
      "15:00",
      [
        { time: "11:30", days: 30 },
        { time: "12:25", days: 1 },
      ],
    ],
    ["16:00", release("15:30")],
    ["17:00", release("15:30")],
    ["18:00", release("15:30")],
  ].map(([cutoff, publications]) => ({
    cutoff,
    publications,
  })) as MonthlyData["cutoffs"];

  test("groups neighbouring cutoffs that use the same forecasts", () => {
    expect(releaseInfo(rows, "17:00")).toMatchObject({
      release: "15:30",
      sameFrom: "16:00",
      sameTo: "18:00",
    });
    expect(releaseInfo(rows, "12:00")).toMatchObject({
      sameFrom: "12:00",
      sameTo: "12:00",
    });
  });

  test("names irregular releases and leaves them out of the schedule", () => {
    const info = releaseInfo(rows, "14:00");
    expect(info?.release).toBe("11:30 (12:25 on 1 day)");
    expect([info?.sameFrom, info?.sameTo]).toEqual(["13:00", "15:00"]);
    expect(info?.schedule).toEqual(["09:30", "11:30", "15:30"]);
    expect(releaseLabel([])).toBeNull();
  });
});
