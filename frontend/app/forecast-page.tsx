"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ErrorChart, ForecastChart, chartConfig } from "./forecast-chart";
import { ReleaseNotice } from "./release-notice";
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

const NOTES_ID = "assumptions";

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

  function openNote(id: number) {
    setNotesOpen(true);
    // Wait for the panel to render before scrolling to the note.
    requestAnimationFrame(() =>
      document
        .getElementById(`note-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  const decisionDate = shiftDate(date, -1);
  const forecastHours = data
    ? new Set(
        data.points
          .filter((p) => p.forecast !== null)
          .map((p) => p.forecast_hour),
      ).size
    : 0;

  return (
    <div className="min-h-svh">
      <SiteHeader active="daily" cutoff={cutoff} />

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <Card>
          <CardContent className="grid gap-6 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:gap-8">
            <section
              aria-labelledby="delivery-label"
              className="grid content-start gap-2"
            >
              <div>
                <h2
                  id="delivery-label"
                  className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                >
                  Delivery date
                  <NoteRef id={1} onOpen={openNote} />
                </h2>
                <p className="text-xs text-muted-foreground">
                  The day being forecast
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
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
                        className="h-8 flex-1 justify-start font-medium tabular-nums"
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
                  size="icon"
                  aria-label="Next delivery day"
                  disabled={date >= LAST_DATE}
                  onClick={() => update({ date: shiftDate(date, 1) })}
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </section>

            <section
              aria-labelledby="cutoff-label"
              className="grid content-start gap-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div>
                  <h2
                    id="cutoff-label"
                    className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    Cutoff time · {shortDayLabel(decisionDate)}
                    <NoteRef id={2} onOpen={openNote} />
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    The latest moment information can be used. Only forecasts
                    published by this time, on the day before delivery, are
                    shown.
                  </p>
                </div>
                {data && (
                  <Badge variant="secondary" className="tabular-nums">
                    {data.publish_time
                      ? `Forecast published ${publicationLabel(data.publish_time)}`
                      : "No forecast published yet"}
                  </Badge>
                )}
              </div>
              <ToggleGroup
                aria-label="Cutoff time, GMT"
                variant="outline"
                size="sm"
                spacing={1}
                value={[cutoff]}
                onValueChange={(value: string[]) => {
                  if (value[0]) update({ cutoff: value[0] });
                }}
                className="grid w-full grid-cols-6 sm:grid-cols-8 lg:grid-cols-12"
              >
                {(cutoffs.includes(cutoff)
                  ? cutoffs
                  : [...cutoffs, cutoff].sort()
                ).map((time) => (
                  <ToggleGroupItem
                    key={time}
                    value={time}
                    className="w-full tabular-nums data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground"
                  >
                    {time}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {data && <ReleaseNotice {...dailyReleaseInfo(data, cutoff)} />}
              <p className="text-xs text-muted-foreground">
                Default 10:00, a common planning point before day-ahead auctions
                close. All times GMT.
              </p>
            </section>
          </CardContent>
        </Card>

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
          <Card>
            <CardContent className="grid h-[480px] place-items-center text-sm text-muted-foreground">
              Loading forecasts…
            </CardContent>
          </Card>
        ) : (
          <Card
            aria-busy={loading}
            className="transition-opacity data-[busy=true]:opacity-60"
            data-busy={loading}
          >
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="grid gap-1">
                <CardTitle className="text-lg">
                  Forecasts for {dayLabel(data.delivery_date)}
                </CardTitle>
                <CardDescription>
                  Using information available by {dayLabel(data.decision_date)},{" "}
                  {cutoff} GMT
                </CardDescription>
              </div>
              <Label className="shrink-0 cursor-pointer rounded-lg border px-3 py-2">
                <Checkbox
                  checked={actuals}
                  onCheckedChange={(checked) => update({ actuals: checked })}
                />
                Show actuals & errors
              </Label>
            </CardHeader>
            <CardContent className="grid gap-4">
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

              {actuals && (
                <Alert>
                  <EyeIcon />
                  <AlertTitle>Historical comparison</AlertTitle>
                  <AlertDescription>
                    Actual values were not available at this cutoff. They are
                    shown only to assess how the forecast performed.
                    <NoteRef id={6} onOpen={openNote} />
                  </AlertDescription>
                </Alert>
              )}

              <Legend actuals={actuals} />
              <ForecastChart points={data.points} actuals={actuals} />

              {actuals && (
                <>
                  <div className="grid gap-1 border-t pt-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-sm font-medium">
                        Error per half-hour
                        <NoteRef id={3} onOpen={openNote} />
                        <NoteRef id={4} onOpen={openNote} />
                      </h3>
                      <ErrorLegend />
                    </div>
                    <ErrorChart points={data.points} />
                  </div>
                  <MetricStrip metrics={data.metrics} onOpenNote={openNote} />
                </>
              )}
            </CardContent>
          </Card>
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

function Legend({ actuals }: { actuals: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Swatch color={chartConfig.forecast.color} />
        Forecast
      </span>
      {actuals && (
        <span className="flex items-center gap-1.5">
          <Swatch color={chartConfig.actual.color} dashed />
          Actual
        </span>
      )}
      <span className="ml-auto">Generation · MW · hover for details</span>
    </div>
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

function MetricStrip({
  metrics,
  onOpenNote,
}: {
  metrics: Metrics;
  onOpenNote: (id: number) => void;
}) {
  const items = [
    {
      label: "Accuracy",
      value:
        metrics.accuracy === null ? "—" : `${metrics.accuracy.toFixed(1)}%`,
      hint: "100% minus total error ÷ total actual output",
    },
    {
      label: "MAE",
      value: `${number(metrics.mae)} MW`,
      hint: "Typical size of a miss",
    },
    {
      label: "RMSE",
      value: `${number(metrics.rmse)} MW`,
      hint: "Weights large misses more",
    },
    {
      label: "Too high / too low",
      value: `${metrics.overestimated_intervals} / ${metrics.underestimated_intervals}`,
      hint: `Half-hours out of ${metrics.matched_intervals} compared`,
    },
  ];
  return (
    <section aria-label="Error metrics" className="grid gap-2">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="grid gap-1 bg-card p-3">
            <span className="text-xs text-muted-foreground">
              {item.label}
              <NoteRef id={5} onOpen={onOpenNote} />
            </span>
            <strong className="text-xl font-medium tabular-nums">
              {item.value}
            </strong>
            <span className="text-xs text-muted-foreground">{item.hint}</span>
          </div>
        ))}
      </div>
      {metrics.matched_intervals < metrics.expected_intervals && (
        <p className="text-xs text-muted-foreground">
          Based on {metrics.matched_intervals} of {metrics.expected_intervals}{" "}
          half-hours. Missing values are excluded, never treated as zero.
        </p>
      )}
    </section>
  );
}

function Notes({ data }: { data: ForecastData | null }) {
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
  return (
    <ol id={NOTES_ID} className="grid max-w-3xl gap-4 text-sm">
      {notes.map((note, index) => (
        <li
          key={note.title}
          id={`note-${index + 1}`}
          className="grid grid-cols-[2rem_1fr] gap-x-2 scroll-mt-24"
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
