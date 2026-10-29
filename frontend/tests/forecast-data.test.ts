import { describe, expect, test } from "bun:test";
import {
  errorDirection,
  fromLocalDate,
  intervalLabel,
  readSettings,
  settingsQuery,
  shiftDate,
  signed,
  toLocalDate,
} from "../app/forecast-data";

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
