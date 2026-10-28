"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
type Metrics = {
  mae: number | null;
  bias: number | null;
  rmse: number | null;
  matched_hours: number;
  expected_hours: number;
};
type Point = {
  start_time: string;
  publish_time: string | null;
  forecast: number | null;
  actual: number | null;
  error: number | null;
};
type Data = {
  decision_date: string;
  delivery_date: string;
  decision_at: string;
  points: Point[];
  metrics: Metrics;
  month_metrics: Metrics;
};
const number = (value: number | null, signed = false) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("en-GB", {
        maximumFractionDigits: 0,
        signDisplay: signed ? "exceptZero" : "auto",
      }).format(value);
const dayLabel = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
const hourLabel = (value: string) =>
  new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });

type View = "forecast" | "compare" | "error";
type Tab = "delivery" | "month" | "data";
const dates = Array.from(
  { length: 31 },
  (_, i) => `2026-01-${String(i + 1).padStart(2, "0")}`,
);
function Arrow({ back = false }: { back?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d={back ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6"} />
    </svg>
  );
}
function Plot({
  points,
  view,
  hour,
  onHour,
}: {
  points: Point[];
  view: View;
  hour: number;
  onHour: (hour: number) => void;
}) {
  const [range, setRange] = useState({
    startIndex: 0,
    endIndex: points.length - 1,
  });
  const data = points
    .slice(range.startIndex, range.endIndex + 1)
    .map((p) => ({ ...p, hour: hourLabel(p.start_time) }));
  const error = view === "error";
  const max = Math.max(
    1000,
    ...points
      .slice(range.startIndex, range.endIndex + 1)
      .flatMap((p) =>
        error
          ? [Math.abs(p.error ?? 0)]
          : [p.forecast ?? 0, view === "compare" ? (p.actual ?? 0) : 0],
      ),
  );
  const ceiling = Math.ceil(max / 2000) * 2000;
  return (
    <>
      <div className="plot-meta">
        <div className="series-key">
          <span>
            <i />
            {error ? "Overestimated" : "Forecast at cutoff"}
          </span>
          {view !== "forecast" && (
            <span>
              <i className="actual" />
              {error ? "Underestimated" : "Actual generation"}
            </span>
          )}
          <span className="unit">MW</span>
        </div>
        <div
          className="window-controls"
          role="group"
          aria-label="Chart time window"
        >
          {[
            { label: "24h", startIndex: 0, endIndex: 23 },
            { label: "00–08", startIndex: 0, endIndex: 8 },
            { label: "08–16", startIndex: 8, endIndex: 16 },
            { label: "16–23", startIndex: 16, endIndex: 23 },
          ].map((w) => (
            <button
              key={w.label}
              aria-pressed={
                range.startIndex === w.startIndex &&
                range.endIndex === w.endIndex
              }
              onClick={() =>
                setRange({ startIndex: w.startIndex, endIndex: w.endIndex })
              }
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
      <div className="plot-canvas">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart
            data={data}
            accessibilityLayer
            aria-label={
              error
                ? "Hourly signed forecast error. Use arrow keys to inspect values, or click to pin an hour."
                : "Hourly wind generation. Use arrow keys to inspect values, or click to pin an hour."
            }
            margin={{ top: 24, right: 16, bottom: 12, left: 0 }}
            onClick={(state) => {
              if (
                state.activeTooltipIndex !== undefined &&
                state.activeTooltipIndex !== null
              ) {
                const i = Number(state.activeTooltipIndex) + range.startIndex;
                if (Number.isInteger(i) && i >= 0 && i < points.length)
                  onHour(i);
              }
            }}
          >
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="hour"
              minTickGap={52}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#a2adb4", fontSize: 11 }}
              dy={10}
            />
            <YAxis
              width={54}
              tickFormatter={(v) => number(v)}
              domain={error ? [-ceiling, ceiling] : [0, ceiling]}
              allowDataOverflow
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#a2adb4", fontSize: 11 }}
            />
            <Tooltip
              isAnimationActive={false}
              filterNull={false}
              cursor={{ stroke: "#66747c", strokeDasharray: "3 4" }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as Point | undefined;
                return active && p ? (
                  <div
                    className="plot-tooltip"
                    role="status"
                    aria-live="polite"
                  >
                    <strong>{hourLabel(p.start_time)} GMT</strong>
                    <p>
                      Forecast <b>{number(p.forecast)} MW</b>
                    </p>
                    {view !== "forecast" && (
                      <>
                        <p>
                          Actual <b>{number(p.actual)} MW</b>
                        </p>
                        <p>
                          Error <b>{number(p.error, true)} MW</b>
                        </p>
                        <small>Hindsight</small>
                      </>
                    )}
                  </div>
                ) : null;
              }}
            />
            <ReferenceLine
              x={points[hour] ? hourLabel(points[hour].start_time) : undefined}
              stroke="#89958a"
              strokeDasharray="2 5"
            />
            {error ? (
              <>
                <ReferenceLine y={0} stroke="#88959c" />
                <Bar dataKey="error" isAnimationActive={false} maxBarSize={28}>
                  {data.map((p) => (
                    <Cell
                      key={p.start_time}
                      fill={
                        p.error !== null && p.error < 0 ? "#a5bfe3" : "#d1ec91"
                      }
                    />
                  ))}
                </Bar>
              </>
            ) : (
              <>
                <Area
                  type="linear"
                  dataKey="forecast"
                  fill="#d1ec91"
                  fillOpacity={0.035}
                  stroke="none"
                  isAnimationActive={false}
                  connectNulls={false}
                  tooltipType="none"
                />
                <Line
                  dataKey="forecast"
                  stroke="#d1ec91"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#d1ec91",
                    stroke: "#151a1e",
                    strokeWidth: 2,
                  }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                {view === "compare" && (
                  <Line
                    dataKey="actual"
                    stroke="#a5bfe3"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )}
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export default function Dashboard() {
  const [date, setDate] = useState("2026-01-15");
  const [cutoff, setCutoff] = useState("10:00");
  const [view, setView] = useState<View>("forecast");
  const [tab, setTab] = useState<Tab>("delivery");
  const [hour, setHour] = useState(12);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: Data;
    error?: string;
  } | null>(null);
  const key = `${date}/${cutoff}/${retry}`;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/dashboard?decision_date=${date}&cutoff=${cutoff}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            "Wind analysis could not be loaded. Try the request again.",
          );
        return r.json() as Promise<Data>;
      })
      .then((data) => setResult({ key, data }))
      .catch((e) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error:
              e instanceof Error ? e.message : "Unable to connect to the API.",
          });
      });
    return () => controller.abort();
  }, [date, cutoff, key]);
  const data = result?.key === key ? result.data : undefined;
  const error = result?.key === key ? result.error : undefined;
  const point = data?.points[hour];
  const forecastHours =
    data?.points.filter((p) => p.forecast !== null).length ?? 0;
  const average =
    data && forecastHours
      ? data.points.reduce((sum, p) => sum + (p.forecast ?? 0), 0) /
        forecastHours
      : null;
  const index = dates.indexOf(date);
  function changeDay(direction: number) {
    if (dates[index + direction]) setDate(dates[index + direction]);
  }
  return (
    <div className="app-shell">
      <header className="masthead">
        <Link className="wordmark" href="/" aria-label="dahptd home">
          dahptd
        </Link>
        <span className="archive-label">GB wind · January 2026</span>
      </header>
      <div className="workspace">
        <aside className="decision-rail" aria-label="Decision settings">
          <div className="rail-heading">
            <span>Decision date</span>
            <span className="quiet">GMT</span>
          </div>
          <div className="calendar-heading">
            <strong>
              January <span>2026</span>
            </strong>
          </div>
          <div className="calendar-week" aria-hidden="true">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div
            className="calendar"
            role="group"
            aria-label="January 2026 purchase decision dates"
          >
            <span />
            <span />
            <span />
            {dates.map((d, i) => (
              <button
                key={d}
                onClick={() => setDate(d)}
                aria-pressed={date === d}
                aria-label={`Decision ${dayLabel(d)}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mobile-date">
            <label htmlFor="decision-date">Purchase decision date</label>
            <select
              id="decision-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            >
              {dates.map((d) => (
                <option value={d} key={d}>
                  {dayLabel(d)}
                </option>
              ))}
            </select>
          </div>
          <div className="cutoff-setting">
            <h2 title="Illustrative planning cutoff, not a verified auction deadline">
              Cutoff · GMT
            </h2>
            <div
              className="cutoff-options"
              role="group"
              aria-label="Decision cutoff, London time"
            >
              {["09:00", "10:00", "11:00", "12:00"].map((t) => (
                <button
                  key={t}
                  aria-pressed={cutoff === t}
                  onClick={() => setCutoff(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </aside>
        <main className="main-workspace">
          <nav className="workspace-nav" aria-label="Analysis views">
            {(
              [
                { id: "delivery", label: "Delivery" },
                { id: "month", label: "Monthly" },
                { id: "data", label: "Data" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                aria-pressed={tab === t.id}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="workspace-title">
            <div>
              <h1>
                {tab === "month"
                  ? "January 2026"
                  : data
                    ? dayLabel(data.delivery_date)
                    : "Loading…"}
              </h1>
              <p>
                {tab === "month"
                  ? `Monthly errors · hindsight · ${cutoff} cutoff`
                  : tab === "data"
                    ? "Hourly data · GMT"
                    : "Delivery · GMT"}
              </p>
            </div>
            <div className="day-stepper">
              <button
                aria-label="Previous decision day"
                disabled={index === 0}
                onClick={() => changeDay(-1)}
              >
                <Arrow back />
              </button>
              <span>{String(index + 1).padStart(2, "0")} / 31</span>
              <button
                aria-label="Next decision day"
                disabled={index === 30}
                onClick={() => changeDay(1)}
              >
                <Arrow />
              </button>
            </div>
          </div>
          {error && (
            <div role="alert" className="request-error">
              <h2>Analysis unavailable</h2>
              <p>{error}</p>
              <button onClick={() => setRetry((v) => v + 1)}>
                Retry request
              </button>
            </div>
          )}
          {!data && !error && (
            <div className="loading-workspace" role="status">
              <div />
              <p>Loading forecast publications…</p>
            </div>
          )}
          {data && (
            <>
              {forecastHours === 0 && (
                <p className="coverage-warning" role="status">
                  No eligible forecasts at this cutoff. Choose another decision
                  date or publication cutoff; missing observations are never
                  treated as zero.
                </p>
              )}
              {data.metrics.matched_hours < data.metrics.expected_hours && (
                <p className="coverage-warning" role="status">
                  Incomplete coverage: {data.metrics.matched_hours}/
                  {data.metrics.expected_hours} matched hours. Missing values
                  remain gaps and are excluded from errors.
                </p>
              )}
              {tab === "delivery" && (
                <>
                  <div className="analysis-toolbar">
                    <div
                      className="view-switch"
                      role="group"
                      aria-label="Chart view"
                    >
                      {(
                        [
                          { id: "forecast", label: "Forecast" },
                          { id: "compare", label: "Compare actuals" },
                          { id: "error", label: "Signed error" },
                        ] as const
                      ).map((v) => (
                        <button
                          key={v.id}
                          aria-pressed={view === v.id}
                          onClick={() => setView(v.id)}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                    <span
                      className={
                        view === "forecast"
                          ? "data-state"
                          : "data-state hindsight"
                      }
                    >
                      {view === "forecast" ? "At cutoff" : "Hindsight"}
                    </span>
                  </div>
                  <div className="analysis-grid">
                    <section
                      className="plot-section"
                      aria-label="Wind generation chart"
                    >
                      <Plot
                        key={`${date}/${cutoff}`}
                        points={data.points}
                        view={view}
                        hour={hour}
                        onHour={setHour}
                      />
                      <div
                        className="daily-measures"
                        role="group"
                        aria-label="Selected day summary"
                      >
                        <div>
                          <span>Mean forecast</span>
                          <strong>
                            {number(average)}
                            <small>MW</small>
                          </strong>
                        </div>
                        <div>
                          <span>
                            MAE <em>Hindsight</em>
                          </span>
                          <strong>
                            {number(data.metrics.mae)}
                            <small>MW</small>
                          </strong>
                        </div>
                        <div>
                          <span>
                            Bias <em>Hindsight</em>
                          </span>
                          <strong>
                            {number(data.metrics.bias, true)}
                            <small>MW</small>
                          </strong>
                        </div>
                        <div>
                          <span>Matched hours</span>
                          <strong>
                            {data.metrics.matched_hours}
                            <small>/ {data.metrics.expected_hours}</small>
                          </strong>
                        </div>
                      </div>
                    </section>
                    <aside
                      className="hour-inspector"
                      aria-label="Selected hour inspector"
                    >
                      <div className="inspector-title">
                        <h2>Selected hour</h2>
                      </div>
                      <div className="hour-navigation">
                        <button
                          disabled={hour === 0}
                          aria-label="Previous hour"
                          onClick={() => setHour((h) => h - 1)}
                        >
                          <Arrow back />
                        </button>
                        <strong>
                          {point ? hourLabel(point.start_time) : "—"}
                          <span>GMT</span>
                        </strong>
                        <button
                          disabled={hour === 23}
                          aria-label="Next hour"
                          onClick={() => setHour((h) => h + 1)}
                        >
                          <Arrow />
                        </button>
                      </div>
                      <label className="sr-only" htmlFor="hour-slider">
                        Selected delivery hour
                      </label>
                      <input
                        id="hour-slider"
                        type="range"
                        min="0"
                        max="23"
                        value={hour}
                        onChange={(e) => setHour(Number(e.target.value))}
                        aria-valuetext={`${String(hour).padStart(2, "0")}:00 GMT`}
                      />
                      <div className="slider-labels">
                        <span>00:00</span>
                        <span>23:00</span>
                      </div>
                      <dl className="inspector-values">
                        <div>
                          <dt>
                            <i />
                            Forecast
                          </dt>
                          <dd>
                            {number(point?.forecast ?? null)} <small>MW</small>
                          </dd>
                        </div>
                        {view !== "forecast" && (
                          <>
                            <div>
                              <dt>
                                <i className="actual" />
                                Actual · hindsight
                              </dt>
                              <dd>
                                {number(point?.actual ?? null)}{" "}
                                <small>MW</small>
                              </dd>
                            </div>
                            <div>
                              <dt>Signed error</dt>
                              <dd>
                                {number(point?.error ?? null, true)}{" "}
                                <small>MW</small>
                              </dd>
                            </div>
                          </>
                        )}
                      </dl>
                      <div className="publication">
                        <h3>Forecast publication</h3>
                        <p>
                          {point?.publish_time ? (
                            <>
                              {dayLabel(point.publish_time.slice(0, 10))}
                              <strong>
                                {hourLabel(point.publish_time)} <span>GMT</span>
                              </strong>
                            </>
                          ) : (
                            "No eligible publication"
                          )}
                        </p>
                      </div>
                    </aside>
                  </div>
                </>
              )}
              {tab === "month" && (
                <section className="monthly-review">
                  <table className="metrics-table">
                    <thead>
                      <tr>
                        <th>Measure</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th>Mean absolute error</th>
                        <td>
                          {number(data.month_metrics.mae)} <small>MW</small>
                        </td>
                      </tr>
                      <tr>
                        <th>Root mean squared error</th>
                        <td>
                          {number(data.month_metrics.rmse)} <small>MW</small>
                        </td>
                      </tr>
                      <tr>
                        <th>Directional bias</th>
                        <td>
                          {number(data.month_metrics.bias, true)}{" "}
                          <small>MW</small>
                        </td>
                      </tr>
                      <tr>
                        <th>Matched observations</th>
                        <td>
                          {data.month_metrics.matched_hours}{" "}
                          <small>
                            / {data.month_metrics.expected_hours} hrs
                          </small>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </section>
              )}
              {tab === "data" && (
                <section className="source-data">
                  <div className="table-scroll">
                    <table>
                      <caption>Actuals & errors · hindsight</caption>
                      <thead>
                        <tr>
                          <th>Hour</th>
                          <th>Forecast publication · GMT</th>
                          <th>Forecast MW</th>
                          <th>Actual MW</th>
                          <th>Error MW</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.points.map((p, i) => (
                          <tr
                            key={p.start_time}
                            className={i === hour ? "selected-row" : ""}
                          >
                            <td>
                              <button
                                onClick={() => {
                                  setHour(i);
                                  setTab("delivery");
                                }}
                                aria-label={`Inspect ${hourLabel(p.start_time)} delivery hour`}
                              >
                                {hourLabel(p.start_time)}
                              </button>
                            </td>
                            <td>
                              {p.publish_time
                                ? `${dayLabel(p.publish_time.slice(0, 10))}, ${hourLabel(p.publish_time)}`
                                : "Missing"}
                            </td>
                            <td>{number(p.forecast)}</td>
                            <td>{number(p.actual)}</td>
                            <td>{number(p.error, true)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              <details className="methodology">
                <summary>
                  Methodology
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <div className="method">
                  <p>
                    The cutoff is illustrative, not a verified auction deadline.
                    Monthly metrics pool matched hourly errors. Historical
                    errors are not confidence intervals.
                  </p>
                  <p>
                    For each delivery hour, select the latest WINDFOR
                    publication at or before the previous day’s cutoff. Forecast
                    publication times may differ between hours. Later updates
                    are excluded.
                  </p>
                  <p>
                    Hourly alignment assumption: each hourly WINDFOR value
                    represents its starting hour; actual generation is the mean
                    of its two FUELHH half-hours. Both half-hours are required.
                    Missing pairs are excluded from all error metrics.
                  </p>
                  <p>
                    MAE = mean absolute error. RMSE = square root of mean
                    squared error. Bias = mean(forecast − actual). All are in
                    MW, not MWh. Metrics use unrounded values.
                  </p>
                  <p>
                    National Elexon wind only; not a utility’s portfolio. No
                    demand or price data is available, so this tool does not
                    calculate purchase volumes or costs. Actuals are a
                    downloaded snapshot, not an archive of what was known at
                    decision time.
                  </p>
                  <p>
                    Data provenance: backend/data/elexon/manifest.json records
                    retrieval time, exact source URLs, coverage and checksums.
                    The pilot uses a fixed historical snapshot, not live data.
                  </p>
                </div>{" "}
              </details>
            </>
          )}
          <footer>Elexon · MW · GMT</footer>
        </main>
      </div>
    </div>
  );
}
