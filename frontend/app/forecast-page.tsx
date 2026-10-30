"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ErrorChart, ForecastChart, chartConfig } from "./forecast-chart";
import { ReleaseNotice } from "./release-notice";
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
} from "./sheet";
import { SiteHeader } from "./site-header";
import {
  FIRST_DATE,
  LAST_DATE,
  cutoffs,
  dailyReleaseInfo,
  dayLabel,
  fromLocalDate,
  number,
  publicationLabel,
  readSettings,
  settingsQuery,
  shiftDate,
  shortDayLabel,
  toLocalDate,
  type ForecastData,
  type Metrics,
  type Settings,
} from "./forecast-data";

export default function ForecastPage() {
  const settings = readSettings(useSearchParams());
  const { date, cutoff, actuals } = settings;
  const [notesOpen, setNotesOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: ForecastData;
    error?: string;
  } | null>(null);
  // Keep showing the previous view while the next one loads, so the page
  // doesn't jump when the cutoff or date changes.
  const [shown, setShown] = useState<ForecastData | null>(null);
  const key = `${date}/${cutoff}/${retry}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/forecast?delivery_date=${date}&cutoff=${cutoff}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Forecasts could not be loaded. Try again.");
        return response.json() as Promise<ForecastData>;
      })
      .then((data) => {
        setResult({ key, data });
        setShown(data);
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
  }, [date, cutoff, key]);

  const error = result?.key === key ? result.error : undefined;
  const loading = result?.key !== key;
  const data = shown;

  function update(changes: Partial<Settings>) {
    window.history.replaceState(
      null,
      "",
      `?${settingsQuery({ ...settings, ...changes })}`,
    );
  }

  const openNote = noteOpener(setNotesOpen);
  const decisionDate = shiftDate(date, -1);
  const forecastHours = data
    ? new Set(
        data.points
          .filter((p) => p.forecast !== null)
          .map((p) => p.forecast_hour),
      ).size
    : 0;

  const panel = (
    <>
      <PanelGroup
        id="delivery-label"
        label={
          <>
            Delivery date
            <NoteRef id={1} onOpen={openNote} />
          </>
        }
        hint="The day being forecast"
      >
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Previous delivery day"
            disabled={date <= FIRST_DATE}
            onClick={() => update({ date: shiftDate(date, -1) })}
          >
            <ChevronLeftIcon />
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 justify-start font-semibold tabular-nums"
                />
              }
            >
              <CalendarIcon data-icon="inline-start" />
              {shortDayLabel(date)} 2026
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toLocalDate(date)}
                defaultMonth={toLocalDate(date)}
                startMonth={toLocalDate(FIRST_DATE)}
                endMonth={toLocalDate(LAST_DATE)}
                disabled={[
                  { before: toLocalDate(FIRST_DATE) },
                  { after: toLocalDate(LAST_DATE) },
                ]}
                weekStartsOn={1}
                onSelect={(value) => {
                  if (!value) return;
                  update({ date: fromLocalDate(value) });
                  setCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Next delivery day"
            disabled={date >= LAST_DATE}
            onClick={() => update({ date: shiftDate(date, 1) })}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </PanelGroup>

      <PanelGroup
        id="cutoff-label"
        label={
          <>
            Cutoff · {shortDayLabel(decisionDate)}
            <NoteRef id={2} onOpen={openNote} />
          </>
        }
        hint="The latest moment information can be used. Only forecasts published by then, on the day before delivery, count."
      >
        <CutoffGrid
          cutoffs={
            cutoffs.includes(cutoff) ? cutoffs : [...cutoffs, cutoff].sort()
          }
          value={cutoff}
          releases={data?.schedule ?? []}
          onChange={(value) => update({ cutoff: value })}
        />
        {data && <ReleaseNotice {...dailyReleaseInfo(data, cutoff)} />}
        <p className="text-[0.8rem] text-muted-foreground">
          Default 10:00, a common planning point before day-ahead auctions
          close. All times GMT.
        </p>
      </PanelGroup>
    </>
  );

  const legend = (
    <>
      <LegendKey
        items={[
          { color: chartConfig.forecast.color, label: "Forecast at cutoff" },
          ...(actuals
            ? [
                {
                  color: chartConfig.actual.color,
                  kind: "dashed" as const,
                  label: "Actual generation (hindsight)",
                },
              ]
            : []),
        ]}
      />
      {actuals && <DepthKey />}
    </>
  );

  return (
    <div className="min-h-svh">
      <SiteHeader
        active="daily"
        cutoff={cutoff}
        readout={`Delivery ${shortDayLabel(date)} 2026 · cutoff ${cutoff}, ${shortDayLabel(decisionDate)}`}
      />
      <Sheet panel={panel} legend={legend}>
        {error ? (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>Forecasts unavailable</AlertTitle>
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
          <div className="grid h-[480px] place-items-center rounded-[var(--radius)] border-[1.5px] border-dashed border-border text-sm text-muted-foreground">
            Loading forecasts…
          </div>
        ) : (
          <div
            aria-busy={loading}
            className={`grid gap-8 transition-opacity duration-200 ${loading ? "opacity-60" : ""}`}
          >
            <header className="grid gap-2">
              <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-4xl">
                {headline(data, actuals)}
              </h1>
              <p className="text-muted-foreground">
                {data.publish_time
                  ? `Released ${publicationLabel(data.publish_time)} GMT, the latest forecast at a ${cutoff} cutoff on ${dayLabel(data.decision_date)}.`
                  : `No forecast had been published by ${cutoff} on ${dayLabel(data.decision_date)}.`}
              </p>
            </header>

            {forecastHours < 24 && (
              <Alert>
                <TriangleAlertIcon />
                <AlertTitle>
                  {forecastHours === 0
                    ? "No forecast was published by this cutoff"
                    : `This forecast covers ${forecastHours} of 24 hours`}
                </AlertTitle>
                <AlertDescription>
                  Try a later cutoff. Missing hours are left as gaps.
                </AlertDescription>
              </Alert>
            )}

            <Figure
              title={`Wind generation, ${dayLabel(data.delivery_date)}`}
              description="MW, GB operational-metered wind · hover for half-hour detail"
              aside={
                <ToggleGroup
                  aria-label="What to show"
                  spacing={0}
                  value={[actuals ? "actuals" : "forecast"]}
                  onValueChange={(value: string[]) => {
                    if (value[0]) update({ actuals: value[0] === "actuals" });
                  }}
                  className="overflow-hidden rounded-full border-[1.5px] border-frame"
                >
                  {[
                    { value: "forecast", label: "Forecast only" },
                    { value: "actuals", label: "Show actuals & errors" },
                  ].map((item) => (
                    <ToggleGroupItem
                      key={item.value}
                      value={item.value}
                      className="h-9 rounded-none px-4 text-sm font-semibold data-pressed:bg-primary data-pressed:text-primary-foreground"
                    >
                      {item.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              }
            >
              <ForecastChart points={data.points} actuals={actuals} />
            </Figure>

            {actuals && (
              <section
                aria-labelledby="hindsight-title"
                className="grid gap-6 rounded-[var(--radius)] bg-panel p-4 ring-[1.5px] ring-grid-ink/40 sm:p-6"
              >
                <div className="grid gap-1.5">
                  <h2
                    id="hindsight-title"
                    className="flex items-center gap-2 text-xl font-bold tracking-[-0.015em]"
                  >
                    <EyeIcon
                      aria-hidden="true"
                      className="size-5 text-grid-ink"
                    />
                    Hindsight: how this forecast did
                  </h2>
                  <p className="max-w-[70ch] text-sm text-muted-foreground">
                    Actual values were not available at this cutoff. They are
                    shown only to assess how the forecast performed.
                    <NoteRef id={6} onOpen={openNote} />
                  </p>
                </div>
                <MetricStrip metrics={data.metrics} onOpenNote={openNote} />
                <Figure
                  title={
                    <>
                      Error per half-hour
                      <NoteRef id={3} onOpen={openNote} />
                      <NoteRef id={4} onOpen={openNote} />
                    </>
                  }
                  description="Forecast minus actual. Above zero, the forecast was too high."
                  aside={<ErrorLegend />}
                >
                  <ErrorChart points={data.points} />
                </Figure>
              </section>
            )}
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

/** Lead with the finding once actuals are on; otherwise just name the day. */
function headline(data: ForecastData, actuals: boolean) {
  const day = dayLabel(data.delivery_date, false).replace(" 2026", "");
  const m = data.metrics;
  if (!actuals || !m.matched_intervals) return `Wind forecast for ${day}`;
  const high = m.overestimated_intervals >= m.underestimated_intervals;
  return `${day}: forecast ran ${high ? "high" : "low"} on ${high ? m.overestimated_intervals : m.underestimated_intervals} of ${m.matched_intervals} half-hours`;
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

function MetricStrip({
  metrics,
  onOpenNote,
}: {
  metrics: Metrics;
  onOpenNote: (id: number) => void;
}) {
  const note = <NoteRef id={5} onOpen={onOpenNote} />;
  return (
    <section aria-label="Error metrics" className="grid gap-2">
      <StatStrip
        items={[
          {
            label: <>Accuracy{note}</>,
            value:
              metrics.accuracy === null
                ? "—"
                : `${metrics.accuracy.toFixed(1)}%`,
            hint: "100% minus total error ÷ total actual output",
          },
          {
            label: <>MAE{note}</>,
            value: `${number(metrics.mae)} MW`,
            hint: "Typical size of a miss",
          },
          {
            label: <>RMSE{note}</>,
            value: `${number(metrics.rmse)} MW`,
            hint: "Weights large misses more",
          },
          {
            label: <>Too high / too low{note}</>,
            value: (
              <>
                <span className="text-over-ink">
                  {metrics.overestimated_intervals}
                </span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-under-ink">
                  {metrics.underestimated_intervals}
                </span>
              </>
            ),
            hint: `Half-hours out of ${metrics.matched_intervals} compared`,
          },
        ]}
      />
      {metrics.matched_intervals < metrics.expected_intervals && (
        <p className="text-xs text-muted-foreground">
          Based on {metrics.matched_intervals} of {metrics.expected_intervals}{" "}
          half-hours. Missing values are excluded, never treated as zero.
        </p>
      )}
    </section>
  );
}

function notesFor(data: ForecastData | null) {
  const notes = [
    {
      title: "Delivery date and cutoff",
      body: "You choose the delivery date (the day being forecast). The cutoff is a time on the day before delivery, in Europe/London time, which is GMT throughout January.",
    },
    {
      title: "Which forecast is used",
      body: "The single most recent Elexon WINDFOR publication at or before the cutoff. Nothing published later is used. Elexon publishes roughly eight times a day (around 02:30, 04:30, 07:30, 09:30, 11:30, 15:30, 18:30 and 22:30 GMT), so neighbouring cutoffs often show the same forecast. Hours the publication doesn't cover are left as gaps. The 10:00 default is illustrative, not an exchange rule.",
    },
    {
      title: "Hourly forecasts vs half-hourly actuals",
      body: "Forecasts are hourly; actuals (Elexon FUELHH) are half-hourly. Each hourly forecast is compared separately with both half-hours it covers, with no averaging. On the chart, the forecast is held flat across both half-hours. Variation within an hour therefore counts as error.",
    },
    {
      title: "Error direction",
      body: "Error = forecast − actual. Positive means the forecast was too high (overestimated wind); negative means it was too low.",
    },
    {
      title: "Metrics",
      body: "Accuracy = 100% − WAPE, where WAPE is the sum of absolute errors divided by the sum of actual output. It treats every MW equally, so low-output periods don't dominate. MAE is the average absolute error; RMSE is the square root of the average squared error and emphasises large misses. Too high / too low counts the half-hours in each direction. All metrics describe the selected delivery day only, not the forecast's general tendency.",
    },
    {
      title: "Hindsight",
      body: `Actual values were not available at the cutoff; they are shown for comparison only. Both series are GB operational-metered wind. Actuals are a snapshot${data ? ` retrieved ${dayLabel(data.snapshot.retrieved_at, false)}` : ""}, not settlement-final data, and can reflect curtailment and availability as well as weather.`,
    },
  ];
  return notes;
}
