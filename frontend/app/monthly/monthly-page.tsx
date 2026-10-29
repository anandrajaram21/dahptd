"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDownIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { chartConfig } from "../forecast-chart";
import { cutoffs, dayLabel, number, signed } from "../forecast-data";
import { ReleaseNotice } from "../release-notice";
import { SiteHeader } from "../site-header";
import { CutoffChart, DailyChart, TimeOfDayChart } from "./monthly-charts";
import {
  calendarWeeks,
  dailyHref,
  extremes,
  percent,
  readCutoff,
  releaseInfo,
  share,
  type DaySummary,
  type MonthlyData,
  type Summary,
} from "./monthly-data";

// Calendar shading: one hue, stronger for days with larger misses.
const HEAT = "144, 133, 233";

export default function MonthlyPage() {
  const cutoff = readCutoff(useSearchParams());
  const [notesOpen, setNotesOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; error?: string } | null>(
    null,
  );
  // Keep the previous month visible while a new cutoff loads.
  const [data, setData] = useState<MonthlyData | null>(null);
  const key = `${cutoff}/${retry}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/monthly?cutoff=${cutoff}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("The monthly overview could not be loaded.");
        return response.json() as Promise<MonthlyData>;
      })
      .then((month) => {
        setResult({ key });
        setData(month);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error:
              error instanceof Error
                ? error.message
                : "Unable to connect to the API.",
          });
      });
    return () => controller.abort();
  }, [cutoff, key]);

  const error = result?.key === key ? result.error : undefined;
  const loading = result?.key !== key;

  function selectCutoff(value: string) {
    window.history.replaceState(
      null,
      "",
      `?${new URLSearchParams({ cutoff: value })}`,
    );
  }

  function openNote(id: number) {
    setNotesOpen(true);
    requestAnimationFrame(() =>
      document
        .getElementById(`note-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  return (
    <div className="min-h-svh">
      <SiteHeader active="monthly" cutoff={cutoff} />

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <Card>
          <CardContent className="grid gap-6 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:gap-8">
            <section className="grid content-start gap-1">
              <h1 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Delivery month
                <NoteRef id={1} onOpen={openNote} />
              </h1>
              <p className="text-lg font-medium">January 2026</p>
              <p className="text-xs text-muted-foreground">
                31 delivery days · actuals shown throughout
              </p>
            </section>
            <section aria-labelledby="cutoff-label" className="grid gap-2">
              <div>
                <h2
                  id="cutoff-label"
                  className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                >
                  Cutoff time · day before each delivery
                  <NoteRef id={2} onOpen={openNote} />
                </h2>
                <p className="text-xs text-muted-foreground">
                  Every day uses the latest forecast published by this time on
                  the day before. All times GMT.
                </p>
              </div>
              <ToggleGroup
                aria-label="Cutoff time, GMT"
                variant="outline"
                size="sm"
                spacing={1}
                value={[cutoff]}
                onValueChange={(value: string[]) => {
                  if (value[0]) selectCutoff(value[0]);
                }}
                className="grid w-full grid-cols-6 sm:grid-cols-8 lg:grid-cols-12"
              >
                {cutoffs.map((time) => (
                  <ToggleGroupItem
                    key={time}
                    value={time}
                    className="w-full tabular-nums data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground"
                  >
                    {time}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {data && <ReleaseNotice {...releaseInfo(data.cutoffs, cutoff)} />}
            </section>
          </CardContent>
        </Card>

        {error ? (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>Monthly overview unavailable</AlertTitle>
            <AlertDescription>
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setRetry((value) => value + 1)}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : !data ? (
          <Card>
            <CardContent className="grid h-96 place-items-center text-sm text-muted-foreground">
              Loading monthly overview…
            </CardContent>
          </Card>
        ) : (
          <div
            aria-busy={loading}
            className={`grid gap-6 transition-opacity ${loading ? "opacity-60" : ""}`}
          >
            <Headline summary={data.summary} onOpenNote={openNote} />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Forecast vs actual, day by day
                  <NoteRef id={5} onOpen={openNote} />
                </CardTitle>
                <CardDescription>
                  Daily average generation at the {data.cutoff} cutoff. Click a
                  day to open it.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Swatch color={chartConfig.forecast.color} />
                    Forecast
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Swatch color={chartConfig.actual.color} dashed />
                    Actual
                  </span>
                  <span className="ml-auto">MW · daily average</span>
                </div>
                <DailyChart days={data.days} cutoff={data.cutoff} />
              </CardContent>
            </Card>

            <CalendarCard days={data.days} cutoff={data.cutoff} />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  When in the day do misses happen?
                  <NoteRef id={4} onOpen={openNote} />
                </CardTitle>
                <CardDescription>
                  Average error for each half-hour, across all January days.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <TimeOfDayInsight rows={data.time_of_day} />
                <ErrorLegend />
                <TimeOfDayChart rows={data.time_of_day} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Does a later cutoff help?
                  <NoteRef id={6} onOpen={openNote} />
                </CardTitle>
                <CardDescription>
                  Month accuracy for every cutoff. Click a point to select it.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <CutoffInsight rows={data.cutoffs} selected={data.cutoff} />
                <CutoffChart
                  rows={data.cutoffs}
                  selected={data.cutoff}
                  onSelect={selectCutoff}
                />
              </CardContent>
            </Card>
          </div>
        )}

        <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
          <Card size="sm">
            <CardHeader>
              <CollapsibleTrigger
                render={
                  <Button
                    variant="ghost"
                    className="-mx-2 justify-between font-medium"
                  />
                }
              >
                Assumptions & methodology
                <ChevronDownIcon
                  className={notesOpen ? "rotate-180 transition" : "transition"}
                />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <Notes data={data} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </main>
    </div>
  );
}

function NoteRef({ id, onOpen }: { id: number; onOpen: (id: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      className="ml-0.5 align-super text-[0.65rem] font-medium text-muted-foreground hover:text-foreground"
      aria-label={`Assumption ${id}`}
    >
      [{id}]
    </button>
  );
}

function Swatch({
  color,
  dashed = false,
}: {
  color: string;
  dashed?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-0 w-4 border-t-2"
      style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }}
    />
  );
}

function ErrorLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(["over", "under"] as const).map((key) => (
        <span key={key} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-[2px]"
            style={{ background: chartConfig[key].color }}
          />
          {key === "over"
            ? "Above 0: forecast too high"
            : "Below 0: forecast too low"}
        </span>
      ))}
    </div>
  );
}

function Headline({
  summary,
  onOpenNote,
}: {
  summary: Summary;
  onOpenNote: (id: number) => void;
}) {
  const tooHigh = share(
    summary.overestimated_intervals,
    summary.matched_intervals,
  );
  const direction =
    summary.mean_error === null
      ? null
      : summary.mean_error >= 0
        ? "too high"
        : "too low";
  return (
    <section aria-label="January summary" className="grid gap-3">
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-3 grid gap-1 bg-card p-4 lg:col-span-1">
          <span className="text-xs text-muted-foreground">
            Direction
            <NoteRef id={3} onOpen={onOpenNote} />
            <NoteRef id={4} onOpen={onOpenNote} />
          </span>
          <strong className="text-2xl font-medium tabular-nums">
            Too high {tooHigh}% of the time
          </strong>
          <span className="text-xs text-muted-foreground">
            {summary.mean_error !== null &&
              `Forecast ${signed(summary.mean_error)} MW ${direction} on average · `}
            {number(summary.overestimated_intervals)} of{" "}
            {number(summary.matched_intervals)} half-hours
          </span>
        </div>
        {[
          {
            label: "Accuracy",
            value: percent(summary.accuracy),
            hint: "100% minus total error ÷ total actual",
          },
          {
            label: "MAE",
            value: `${number(summary.mae)} MW`,
            hint: "Typical size of a miss",
          },
          {
            label: "RMSE",
            value: `${number(summary.rmse)} MW`,
            hint: "Weights large misses more",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="grid content-start gap-1 bg-card p-3 sm:p-4"
          >
            <span className="text-xs text-muted-foreground">
              {item.label}
              <NoteRef id={5} onOpen={onOpenNote} />
            </span>
            <strong className="text-lg font-medium tabular-nums sm:text-2xl">
              {item.value}
            </strong>
            <span className="text-xs text-muted-foreground">{item.hint}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CalendarCard({
  days,
  cutoff,
}: {
  days: DaySummary[];
  cutoff: string;
}) {
  const { best, worst } = extremes(days);
  const scored = days.flatMap((day) =>
    day.accuracy === null ? [] : [day.accuracy],
  );
  const [low, high] = [Math.min(...scored), Math.max(...scored)];
  // 0 for the best day, 1 for the worst.
  const severity = (accuracy: number) =>
    high === low ? 0 : (high - accuracy) / (high - low);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Every day at a glance</CardTitle>
        <CardDescription>
          Accuracy per delivery day. Darker means a bigger miss. Click a day to
          open it.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem] md:gap-6">
        <div className="grid gap-1.5" role="grid" aria-label="January 2026">
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
          {calendarWeeks(days).map((week, index) => (
            <div key={index} role="row" className="grid grid-cols-7 gap-1.5">
              {week.map((day, slot) =>
                day ? (
                  <Link
                    key={day.delivery_date}
                    role="gridcell"
                    href={dailyHref(day.delivery_date, cutoff)}
                    aria-label={`${dayLabel(day.delivery_date)}: ${percent(day.accuracy)} accuracy`}
                    className="group grid min-h-14 content-between rounded-md border p-1.5 transition-colors hover:border-foreground/40 sm:min-h-16 sm:p-2"
                    style={{
                      background:
                        day.accuracy === null
                          ? undefined
                          : `rgba(${HEAT}, ${0.06 + 0.64 * severity(day.accuracy)})`,
                    }}
                  >
                    <span className="flex items-center justify-between text-xs text-muted-foreground tabular-nums group-hover:text-foreground">
                      {Number(day.delivery_date.slice(8))}
                      {(day === best || day === worst) && (
                        <span className="hidden text-[0.65rem] font-medium text-foreground sm:inline">
                          {day === best ? "Best" : "Worst"}
                        </span>
                      )}
                    </span>
                    <span className="text-right text-xs font-medium tabular-nums sm:text-sm">
                      {percent(day.accuracy, 0)}
                    </span>
                  </Link>
                ) : (
                  <span key={`empty-${slot}`} role="gridcell" />
                ),
              )}
            </div>
          ))}
        </div>
        <div className="grid content-start gap-4 text-sm">
          {[
            { label: "Best day", day: best },
            { label: "Worst day", day: worst },
          ].map(
            ({ label, day }) =>
              day && (
                <Link
                  key={label}
                  href={dailyHref(day.delivery_date, cutoff)}
                  className="grid gap-0.5 rounded-lg border p-3 hover:border-foreground/40"
                >
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="font-medium">
                    {dayLabel(day.delivery_date, false).replace(" 2026", "")}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {percent(day.accuracy)} accuracy · MAE {number(day.mae)} MW
                  </span>
                </Link>
              ),
          )}
          <div className="grid gap-1.5 text-xs text-muted-foreground">
            <div
              aria-hidden="true"
              className="h-2 rounded-full"
              style={{
                background: `linear-gradient(to right, rgba(${HEAT}, 0.06), rgba(${HEAT}, 0.7))`,
              }}
            />
            <div className="flex justify-between tabular-nums">
              <span>{percent(high, 0)}</span>
              <span>{percent(low, 0)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimeOfDayInsight({ rows }: { rows: MonthlyData["time_of_day"] }) {
  const scored = rows.filter((row) => row.mean_error !== null);
  if (!scored.length) return null;
  const sorted = [...scored].sort(
    (a, b) => Math.abs(b.mean_error ?? 0) - Math.abs(a.mean_error ?? 0),
  );
  const [largest, smallest] = [sorted[0], sorted.at(-1)!];
  return (
    <p className="text-sm">
      Largest average miss at{" "}
      <b className="font-medium tabular-nums">{largest.time}</b> (
      {signed(largest.mean_error ?? 0)} MW), smallest at{" "}
      <b className="font-medium tabular-nums">{smallest.time}</b> (
      {signed(smallest.mean_error ?? 0)} MW).
    </p>
  );
}

function CutoffInsight({
  rows,
  selected,
}: {
  rows: MonthlyData["cutoffs"];
  selected: string;
}) {
  const scored = rows.filter((row) => row.accuracy !== null);
  if (!scored.length) return null;
  const best = scored.reduce((a, b) =>
    (b.accuracy ?? 0) > (a.accuracy ?? 0) ? b : a,
  );
  const worst = scored.reduce((a, b) =>
    (b.accuracy ?? 0) < (a.accuracy ?? 0) ? b : a,
  );
  const current = rows.find((row) => row.cutoff === selected);
  return (
    <p className="text-sm">
      Accuracy ranges from{" "}
      <b className="font-medium tabular-nums">{percent(worst.accuracy)}</b> (
      {worst.cutoff}) to{" "}
      <b className="font-medium tabular-nums">{percent(best.accuracy)}</b> (
      {best.cutoff}), a spread of{" "}
      {((best.accuracy ?? 0) - (worst.accuracy ?? 0)).toFixed(1)} points.
      {current && current.cutoff !== best.cutoff && (
        <>
          {" "}
          {selected} is{" "}
          {((best.accuracy ?? 0) - (current.accuracy ?? 0)).toFixed(1)} points
          below the best.
        </>
      )}
    </p>
  );
}

function Notes({ data }: { data: MonthlyData | null }) {
  const notes = [
    {
      title: "Delivery month",
      body: "All 31 January 2026 delivery days. 1 February is excluded so the month is complete and calendar-aligned.",
    },
    {
      title: "Cutoff and forecast selection",
      body: "For each delivery day, the cutoff is that time on the previous day (GMT in January). The single most recent Elexon WINDFOR publication at or before it is used, exactly as on the daily page. Nothing published later is used.",
    },
    {
      title: "Hourly forecasts vs half-hourly actuals",
      body: "Each hourly forecast is compared separately with both FUELHH half-hours it covers, with no averaging, giving up to 48 comparisons per day and 1,488 for the month.",
    },
    {
      title: "Error direction and time of day",
      body: "Error = forecast − actual, so positive means the forecast was too high. The time-of-day chart averages the signed error for each half-hour slot across the 31 days; 'too high on X of Y days' counts that slot's half-hours in each direction.",
    },
    {
      title: "Metrics",
      body: "Month metrics pool every matched half-hour rather than averaging daily figures. Accuracy = 100% − WAPE (sum of absolute errors ÷ sum of actual output). MAE is the average absolute error; RMSE emphasises large misses. Daily forecast and actual values on the line chart are averages over that day's matched half-hours. Calendar shading is relative to this month's best and worst days.",
    },
    {
      title: "Comparing cutoffs",
      body: "Each point repeats the whole month at a different whole-hour cutoff. Between publications the forecast doesn't change, so neighbouring cutoffs often match. Cutoffs of 00:00–02:00 use the previous evening's 22:30 publication, which covers only 22 of 24 delivery hours, so they are scored on fewer half-hours. Differences describe January only and are not a guarantee for other months.",
    },
    {
      title: "Hindsight",
      body: `Actual values were not available at any cutoff; this page is a retrospective evaluation. Both series are GB operational-metered wind. Actuals are a snapshot${data ? ` retrieved ${dayLabel(data.snapshot.retrieved_at, false)}` : ""} and can reflect curtailment and availability as well as weather.`,
    },
  ];
  return (
    <ol className="grid max-w-3xl gap-4 text-sm">
      {notes.map((note, index) => (
        <li
          key={note.title}
          id={`note-${index + 1}`}
          className="grid scroll-mt-24 grid-cols-[2rem_1fr] gap-x-2"
        >
          <span className="text-muted-foreground tabular-nums">
            [{index + 1}]
          </span>
          <div className="grid gap-1">
            <h3 className="font-medium">{note.title}</h3>
            <p className="leading-relaxed text-muted-foreground">{note.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
