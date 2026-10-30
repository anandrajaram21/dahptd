"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { chartConfig } from "../forecast-chart";
import { cutoffs, dayLabel, number, signed } from "../forecast-data";
import { ReleaseNotice } from "../release-notice";
import {
  CutoffGrid,
  DepthKey,
  Figure,
  LegendKey,
  NoteRef,
  NotesPanel,
  PanelGroup,
  Sheet,
  StatStrip,
  noteOpener,
} from "../sheet";
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

// Calendar shading: the miss-depth ramp, in fixed accuracy steps.
const ACCURACY_STEPS = [
  { min: 90, label: "90%+" },
  { min: 80, label: "80–90%" },
  { min: 60, label: "60–80%" },
  { min: -Infinity, label: "under 60%" },
];
const accuracyStep = (accuracy: number) =>
  ACCURACY_STEPS.findIndex((step) => accuracy >= step.min) + 1;

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

  const openNote = noteOpener(setNotesOpen);
  const release = data ? releaseInfo(data.cutoffs, cutoff) : null;

  const panel = (
    <>
      <PanelGroup
        id="month-label"
        label={
          <>
            Delivery month
            <NoteRef id={1} onOpen={openNote} />
          </>
        }
      >
        <p className="text-lg font-semibold">January 2026</p>
        <p className="text-[0.8rem] text-muted-foreground">
          31 delivery days · actuals shown throughout
        </p>
      </PanelGroup>
      <PanelGroup
        id="cutoff-label"
        label={
          <>
            Cutoff · day before each delivery
            <NoteRef id={2} onOpen={openNote} />
          </>
        }
        hint="Every day uses the latest forecast published by this time on the day before. All times GMT."
      >
        <CutoffGrid
          cutoffs={cutoffs}
          value={cutoff}
          releases={release?.schedule ?? []}
          onChange={selectCutoff}
        />
        {release && <ReleaseNotice {...release} />}
      </PanelGroup>
    </>
  );

  const legend = (
    <>
      <LegendKey
        items={[
          { color: chartConfig.forecast.color, label: "Forecast at cutoff" },
          {
            color: chartConfig.actual.color,
            kind: "dashed",
            label: "Actual generation (hindsight)",
          },
        ]}
      />
      <DepthKey />
    </>
  );

  return (
    <div className="min-h-svh">
      <SiteHeader
        active="monthly"
        cutoff={cutoff}
        readout={`January 2026 · cutoff ${cutoff}, day before delivery`}
      />
      <Sheet panel={panel} legend={legend}>
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
          <div className="grid h-96 place-items-center rounded-[var(--radius)] border-[1.5px] border-dashed border-border text-sm text-muted-foreground">
            Loading monthly overview…
          </div>
        ) : (
          <div
            aria-busy={loading}
            className={`grid gap-10 transition-opacity duration-200 ${loading ? "opacity-60" : ""}`}
          >
            <Headline
              summary={data.summary}
              cutoff={data.cutoff}
              onOpenNote={openNote}
            />

            <Figure
              title={
                <>
                  Forecast vs actual, day by day
                  <NoteRef id={5} onOpen={openNote} />
                </>
              }
              description={`Daily average MW at the ${data.cutoff} cutoff, shaded by miss depth. Click a day to open it.`}
            >
              <DailyChart days={data.days} cutoff={data.cutoff} />
            </Figure>

            <CalendarFigure days={data.days} cutoff={data.cutoff} />

            <Figure
              title={
                <>
                  When in the day do misses happen?
                  <NoteRef id={4} onOpen={openNote} />
                </>
              }
              description={<TimeOfDayInsight rows={data.time_of_day} />}
              aside={<ErrorLegend />}
            >
              <TimeOfDayChart rows={data.time_of_day} />
            </Figure>

            <Figure
              title={
                <>
                  Does a later cutoff help?
                  <NoteRef id={6} onOpen={openNote} />
                </>
              }
              description={
                <CutoffInsight rows={data.cutoffs} selected={data.cutoff} />
              }
            >
              <CutoffChart
                rows={data.cutoffs}
                selected={data.cutoff}
                onSelect={selectCutoff}
              />
            </Figure>
          </div>
        )}

        <NotesPanel
          open={notesOpen}
          onOpenChange={setNotesOpen}
          notes={notesFor(data)}
        />
      </Sheet>
    </div>
  );
}

function ErrorLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-muted-foreground">
      {(["over", "under"] as const).map((key) => (
        <span key={key} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-3 rounded-[2px]"
            style={{ background: chartConfig[key].color }}
          />
          {key === "over" ? "Forecast too high" : "Forecast too low"}
        </span>
      ))}
    </div>
  );
}

function Headline({
  summary,
  cutoff,
  onOpenNote,
}: {
  summary: Summary;
  cutoff: string;
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
  const note = <NoteRef id={5} onOpen={onOpenNote} />;
  return (
    <section aria-label="January summary" className="grid gap-5">
      <header className="grid gap-2">
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-4xl">
          January at {cutoff}: the forecast was{" "}
          <span className="text-over-ink">too high {tooHigh}% of the time</span>
          <NoteRef id={3} onOpen={onOpenNote} />
          <NoteRef id={4} onOpen={onOpenNote} />
        </h1>
        <p className="text-muted-foreground">
          {summary.mean_error !== null &&
            `On average the forecast was ${signed(summary.mean_error)} MW ${direction}, `}
          {number(summary.overestimated_intervals)} of{" "}
          {number(summary.matched_intervals)} half-hours ran high.
        </p>
      </header>
      <StatStrip
        items={[
          {
            label: <>Average miss direction{note}</>,
            value:
              summary.mean_error === null
                ? "—"
                : `${signed(summary.mean_error)} MW`,
            hint: "Forecast minus actual, per half-hour",
            tone:
              summary.mean_error === null
                ? undefined
                : summary.mean_error >= 0
                  ? "over"
                  : "under",
          },
          {
            label: <>Accuracy{note}</>,
            value: percent(summary.accuracy),
            hint: "100% minus total error ÷ total actual",
          },
          {
            label: <>MAE{note}</>,
            value: `${number(summary.mae)} MW`,
            hint: "Typical size of a miss",
          },
          {
            label: <>RMSE{note}</>,
            value: `${number(summary.rmse)} MW`,
            hint: "Weights large misses more",
          },
        ]}
      />
    </section>
  );
}

function CalendarFigure({
  days,
  cutoff,
}: {
  days: DaySummary[];
  cutoff: string;
}) {
  const { best, worst } = extremes(days);
  return (
    <Figure
      title="Every day at a glance"
      description="Accuracy per delivery day, shaded by the same depth ramp. Click a day to open it."
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_15rem] md:gap-6">
        <div className="grid gap-1.5" role="grid" aria-label="January 2026">
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold tracking-[0.08em] text-grid-ink uppercase">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
          {calendarWeeks(days).map((week, index) => (
            <div key={index} role="row" className="grid grid-cols-7 gap-1.5">
              {week.map((day, slot) => {
                if (!day)
                  return <span key={`empty-${slot}`} role="gridcell" />;
                const step =
                  day.accuracy === null ? 0 : accuracyStep(day.accuracy);
                return (
                  <Link
                    key={day.delivery_date}
                    role="gridcell"
                    href={dailyHref(day.delivery_date, cutoff)}
                    aria-label={`${dayLabel(day.delivery_date)}: ${percent(day.accuracy)} accuracy`}
                    className={`grid min-h-14 content-between rounded-[calc(var(--radius)-2px)] border border-frame/15 p-1.5 transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_14px_-6px_rgb(0_0_0/0.35)] sm:min-h-16 sm:p-2 ${step === 4 ? "text-white dark:text-band-foreground" : "text-foreground"}`}
                    style={{
                      background: step ? `var(--over-${step})` : undefined,
                    }}
                  >
                    <span className="flex items-center justify-between text-xs font-semibold tabular-nums">
                      {Number(day.delivery_date.slice(8))}
                      {(day === best || day === worst) && (
                        <span className="hidden rounded-full bg-background px-1.5 py-0.5 text-[0.65rem] font-bold text-foreground sm:inline">
                          {day === best ? "Best" : "Worst"}
                        </span>
                      )}
                    </span>
                    <span className="text-right text-sm font-bold tabular-nums sm:text-base">
                      {percent(day.accuracy, 0)}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
        <div className="grid content-start gap-4 text-sm">
          {[
            { label: "Best day", day: best, tone: "text-under-ink" },
            { label: "Worst day", day: worst, tone: "text-over-ink" },
          ].map(
            ({ label, day, tone }) =>
              day && (
                <Link
                  key={label}
                  href={dailyHref(day.delivery_date, cutoff)}
                  className="grid gap-0.5 rounded-[var(--radius)] border-[1.5px] border-frame p-3 transition-colors hover:bg-accent"
                >
                  <span className={`text-xs font-bold ${tone}`}>{label}</span>
                  <span className="text-lg font-extrabold">
                    {dayLabel(day.delivery_date, false).replace(" 2026", "")}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {percent(day.accuracy)} accuracy · MAE {number(day.mae)} MW
                  </span>
                </Link>
              ),
          )}
          <div className="grid gap-1.5 text-xs">
            <span className="font-bold">Day accuracy</span>
            {ACCURACY_STEPS.map((step, index) => (
              <span key={step.label} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-3.5 w-6 rounded-[2px] border border-frame/15"
                  style={{ background: `var(--over-${index + 1})` }}
                />
                {step.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Figure>
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
    <p className="max-w-[70ch]">
      Largest average miss at{" "}
      <b className="font-bold tabular-nums">{largest.time}</b> (
      {signed(largest.mean_error ?? 0)} MW), smallest at{" "}
      <b className="font-bold tabular-nums">{smallest.time}</b> (
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
    <p className="max-w-[70ch]">
      Accuracy ranges from{" "}
      <b className="font-bold tabular-nums">{percent(worst.accuracy)}</b> (
      {worst.cutoff}) to{" "}
      <b className="font-bold tabular-nums">{percent(best.accuracy)}</b> (
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

function notesFor(data: MonthlyData | null) {
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
  return notes;
}
