import { describe, expect, test } from "bun:test";
import {
  dailyReleaseInfo,
  errorDirection,
  fromLocalDate,
  readSettings,
  settingsQuery,
  shiftDate,
  toLocalDate,
} from "../lib/daily";
import { intervalLabel, signed } from "../lib/format";

describe("settings", () => {
  test("defaults to 16 January at 10:00 with actuals hidden", () => {
    expect(readSettings(new URLSearchParams())).toEqual({
      date: "2026-01-16",
      cutoff: "10:00",
      actuals: false,
    });
  });

  test("rejects dates outside the snapshot and invalid cutoffs", () => {
    const settings = readSettings(
      new URLSearchParams("date=2026-02-02&cutoff=25:45&actuals=yes"),
    );
    expect(settings).toEqual({
      date: "2026-01-16",
      cutoff: "10:00",
      actuals: false,
    });
  });

  test("accepts exact publication minutes when opening from the monthly page", () => {
    expect(
      readSettings(
        new URLSearchParams("date=2026-01-16&cutoff=09:30&actuals=1"),
      ),
    ).toEqual({
      date: "2026-01-16",
      cutoff: "09:30",
      actuals: true,
    });
  });

  test("round-trips through the URL", () => {
    const settings = { date: "2026-02-01", cutoff: "07:00", actuals: true };
    expect(readSettings(new URLSearchParams(settingsQuery(settings)))).toEqual(
      settings,
    );
    expect(settingsQuery({ ...settings, actuals: false })).toBe(
      "date=2026-02-01&cutoff=07%3A00",
    );
  });
});

describe("formatting", () => {
  test("shifts dates across month boundaries", () => {
    expect(shiftDate("2026-01-31", 1)).toBe("2026-02-01");
    expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
  });

  test("converts calendar dates without timezone drift", () => {
    expect(fromLocalDate(toLocalDate("2026-01-16"))).toBe("2026-01-16");
  });

  test("labels intervals and error direction", () => {
    expect(intervalLabel("2026-01-16T14:30:00+00:00", 30)).toBe("14:30–15:00");
    expect(intervalLabel("2026-01-16T14:00:00+00:00", 60)).toBe("14:00–15:00");
    expect(signed(1200)).toBe("+1,200");
    expect(signed(-40)).toBe("−40");
    expect(errorDirection(5)).toBe("Forecast too high");
    expect(errorDirection(-5)).toBe("Forecast too low");
    expect(errorDirection(null)).toBeNull();
  });
});

describe("daily release notice", () => {
  const hour = (h: number, publish: string | null) => ({
    cutoff: `${String(h).padStart(2, "0")}:00`,
    publish_time: publish,
  });
  const releases = [
    hour(12, "2026-01-15T11:30:00+00:00"),
    hour(13, "2026-01-15T12:25:00+00:00"),
    hour(14, "2026-01-15T12:25:00+00:00"),
    hour(15, "2026-01-15T12:25:00+00:00"),
    hour(16, "2026-01-15T15:30:00+00:00"),
  ];

  test("names the forecast and the cutoffs that share it", () => {
    expect(
      dailyReleaseInfo(
        {
          publish_time: "2026-01-15T12:25:00+00:00",
          cutoff_releases: releases,
          schedule: ["11:30", "12:25", "15:30"],
        },
        "14:00",
      ),
    ).toEqual({
      release: "12:25",
      sameFrom: "13:00",
      sameTo: "15:00",
      schedule: ["11:30", "12:25", "15:30"],
    });
  });

  test("handles minute-level cutoffs and missing forecasts", () => {
    const info = dailyReleaseInfo(
      { publish_time: null, cutoff_releases: releases, schedule: [] },
      "09:45",
    );
    expect(info).toMatchObject({ release: null, sameFrom: null, sameTo: null });
  });
});
