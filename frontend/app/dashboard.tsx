"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

function Chart({
  points,
  showActual,
}: {
  points: Point[];
  showActual: boolean;
}) {
  const max = Math.max(
    1000,
    ...points.flatMap((p) => [
      p.forecast ?? 0,
      showActual ? (p.actual ?? 0) : 0,
    ]),
  );
  const ceiling = Math.ceil(max / 2000) * 2000;
  const x = (i: number) => 64 + (i * 866) / 23;
  const y = (v: number) => 260 - (v / ceiling) * 220;
  function path(key: "forecast" | "actual") {
    let connected = false;
    return points
      .map((p, i) => {
        if (p[key] === null) {
          connected = false;
          return "";
        }
        const command = connected ? "L" : "M";
        connected = true;
        return `${command}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`;
      })
      .join(" ");
  }
  return (
    <svg
      viewBox="0 0 960 310"
      role="img"
      aria-label="Hourly next-day wind forecast and optional actual generation in megawatts. Exact values are available in the hourly data table."
      className="wind-chart"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <line
            x1="64"
            x2="930"
            y1={y((ceiling * i) / 4)}
            y2={y((ceiling * i) / 4)}
            stroke="#e4eae8"
            strokeDasharray="4 5"
          />
          <text x="51" y={y((ceiling * i) / 4) + 4} textAnchor="end">
            {number((ceiling * i) / 4)}
          </text>
        </g>
      ))}
      <text x="64" y="20">
        MW
      </text>
      {[0, 4, 8, 12, 16, 20, 23].map((i) => (
        <text key={i} x={x(i)} y="288" textAnchor="middle">
          {String(i).padStart(2, "0")}:00
        </text>
      ))}
      <path
        d={path("forecast")}
        fill="none"
        stroke="#138c72"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {showActual ? (
        <path
          d={path("actual")}
          fill="none"
          stroke="#6579c3"
          strokeWidth="2.5"
          strokeDasharray="7 5"
        />
      ) : null}
      {points.map((p, i) =>
        p.forecast !== null ? (
          <circle key={i} cx={x(i)} cy={y(p.forecast)} r="4" fill="#138c72">
            <title>
              {hourLabel(p.start_time)} · Forecast {number(p.forecast)} MW
              {showActual ? ` · Actual ${number(p.actual)} MW (hindsight)` : ""}
            </title>
          </circle>
        ) : null,
      )}
    </svg>
  );
}

export default function Dashboard() {
  const [date, setDate] = useState("2026-01-15");
  const [cutoff, setCutoff] = useState("10:00");
  const [showActual, setShowActual] = useState(false);
  const [result, setResult] = useState<{
    key: string;
    data?: Data;
    error?: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const key = `${date}/${cutoff}/${retry}`;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/dashboard?decision_date=${date}&cutoff=${cutoff}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "The analysis could not be loaded. Please try again.",
          );
        return response.json() as Promise<Data>;
      })
      .then((data) => setResult({ key, data }))
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
  const data = result?.key === key ? result.data : undefined;
  const error = result?.key === key ? result.error : undefined;
  const forecastHours =
    data?.points.filter((p) => p.forecast !== null).length ?? 0;
  const average =
    forecastHours && data
      ? data.points.reduce((sum, p) => sum + (p.forecast ?? 0), 0) /
        forecastHours
      : null;

  return (
    <>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Windward home">
          <span className="brand-icon">≈</span> windward
          <span className="brand-divider" />{" "}
          <span className="brand-sub">Energy intelligence</span>
        </Link>
        <span className="snapshot">
          <span /> Historical pilot · January 2026
        </span>
      </header>
      <main className="dashboard">
        <div className="intro">
          <div>
            <p className="eyebrow">DAY-AHEAD PLANNING / GREAT BRITAIN</p>
            <h1>A clearer view of tomorrow.</h1>
            <p className="subtitle">
              Explore the wind forecast available before buying power.
              Understand the risk behind it.
            </p>
          </div>
          <span className="source-badge">Elexon · National wind</span>
        </div>
        <section className="controls" aria-label="Analysis settings">
          <div>
            <label htmlFor="decision-date">Purchase decision date</label>
            <select
              id="decision-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            >
              {Array.from({ length: 31 }, (_, i) => {
                const value = `2026-01-${String(i + 1).padStart(2, "0")}`;
                return (
                  <option key={value} value={value}>
                    {dayLabel(value)}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label htmlFor="cutoff">Decision cutoff · London time</label>
            <select
              id="cutoff"
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
            >
              {["09:00", "10:00", "11:00", "12:00"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="delivery">
            <span>DELIVERY DAY</span>
            <strong>{data ? dayLabel(data.delivery_date) : "…"}</strong>
            <small>Latest forecast per hour, published by {cutoff}</small>
          </div>
        </section>
        <p className="assumption">
          ⓘ The cutoff is an illustrative planning assumption, not a verified
          auction deadline. All times are Europe/London (GMT in January).
        </p>
        {error ? (
          <div className="error" role="alert">
            {error}{" "}
            <button onClick={() => setRetry((v) => v + 1)}>Try again</button>
          </div>
        ) : null}
        {!data && !error ? (
          <div className="loading" role="status">
            Loading wind analysis…
          </div>
        ) : null}
        {data ? (
          <div aria-live="polite">
            <section
              className="stats"
              aria-label="Selected delivery day summary"
            >
              <article className="stat">
                <p>Next-day wind forecast</p>
                <strong>
                  {number(average)} <small>MW</small>
                </strong>
                <span>Average across {forecastHours} available hours</span>
              </article>
              <article className="stat">
                <p>
                  Typical forecast error <em>Selected day</em>
                </p>
                <strong>
                  {number(data.metrics.mae)} <small>MW</small>
                </strong>
                <span>Mean absolute error · hindsight</span>
              </article>
              <article className="stat">
                <p>
                  Forecast bias <em>Selected day</em>
                </p>
                <strong>
                  {number(data.metrics.bias, true)} <small>MW</small>
                </strong>
                <span>
                  {data.metrics.bias === null
                    ? "No matched observations"
                    : data.metrics.bias >= 0
                      ? "Wind overestimated on average"
                      : "Wind underestimated on average"}
                </span>
              </article>
              <article className="stat">
                <p>Data coverage</p>
                <strong>
                  {data.metrics.matched_hours}
                  <small> / {data.metrics.expected_hours} hrs</small>
                </strong>
                <span>Forecast and actual both available</span>
              </article>
            </section>
            {data.metrics.matched_hours < 24 ? (
              <p className="warning" role="status">
                Incomplete coverage: missing values are excluded from metrics,
                never replaced with zero.
              </p>
            ) : null}
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">THE NEXT 24 HOURS</p>
                  <h2>
                    Wind generation{" "}
                    <span>· {dayLabel(data.delivery_date)}</span>
                  </h2>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={showActual}
                    onChange={(e) => setShowActual(e.target.checked)}
                  />{" "}
                  Show actuals <span>Hindsight</span>
                </label>
              </div>
              <div className="legend">
                <span>
                  <i className="forecast-line" /> Forecast at cutoff
                </span>
                {showActual ? (
                  <span>
                    <i className="actual-line" /> Actual generation
                  </span>
                ) : null}
                <span className="legend-note">Hourly average · MW</span>
              </div>
              <div
                className="chart-scroll"
                tabIndex={0}
                role="region"
                aria-label="Wind chart; scroll horizontally on small screens"
              >
                <Chart points={data.points} showActual={showActual} />
              </div>
              <p className="chart-note">
                {showActual
                  ? "Actuals are shown for retrospective review only. They were not available at the purchase decision."
                  : "Only forecasts available at the selected decision cutoff are shown. Enable actuals to review what happened."}
              </p>
            </section>
            <section className="monthly panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">THE BIGGER PICTURE</p>
                  <h2>How reliable were January’s forecasts?</h2>
                  <p className="muted">
                    31 purchase decisions · 2 January–1 February delivery ·{" "}
                    {cutoff} cutoff
                  </p>
                </div>
                <span className="pill">Retrospective analysis</span>
              </div>
              <div className="month-stats">
                <div>
                  <span>Typical error · MAE</span>
                  <strong>
                    {number(data.month_metrics.mae)} <small>MW</small>
                  </strong>
                </div>
                <div>
                  <span>Large-error sensitivity · RMSE</span>
                  <strong>
                    {number(data.month_metrics.rmse)} <small>MW</small>
                  </strong>
                </div>
                <div>
                  <span>Average bias</span>
                  <strong>
                    {number(data.month_metrics.bias, true)} <small>MW</small>
                  </strong>
                </div>
                <div>
                  <span>Matched hours</span>
                  <strong>
                    {data.month_metrics.matched_hours}
                    <small> / {data.month_metrics.expected_hours}</small>
                  </strong>
                </div>
              </div>
              <div className="insight">
                <span>↗</span>
                <p>
                  <strong>Read the direction, not just the size.</strong>{" "}
                  Positive bias means less wind arrived than forecast, creating
                  a risk of under-procuring replacement power. These are
                  historical errors, not a guaranteed uncertainty band.
                </p>
              </div>
            </section>
            <details className="panel data-details">
              <summary>
                Inspect hourly data{" "}
                <span>Forecast vintages, actuals & signed error</span>
              </summary>
              <div className="table-wrap">
                <table>
                  <caption>
                    Delivery {dayLabel(data.delivery_date)}. Error = forecast −
                    actual. Actuals and errors are hindsight only.
                  </caption>
                  <thead>
                    <tr>
                      <th>Delivery hour</th>
                      <th>Forecast published (GMT)</th>
                      <th>Forecast MW</th>
                      <th>Actual MW</th>
                      <th>Error MW</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.points.map((p) => (
                      <tr key={p.start_time}>
                        <td>{hourLabel(p.start_time)}</td>
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
            </details>
            <details className="panel data-details">
              <summary>Methodology & limitations</summary>
              <div className="method">
                <p>
                  For each delivery hour, select the latest WINDFOR publication
                  at or before the previous day’s cutoff. Forecast publication
                  times may differ between hours. Later updates are excluded.
                </p>
                <p>
                  Hourly alignment assumption: each hourly WINDFOR value
                  represents its starting hour; actual generation is the mean of
                  its two FUELHH half-hours. Both half-hours are required.
                  Missing pairs are excluded from all error metrics.
                </p>
                <p>
                  MAE = mean absolute error. RMSE = square root of mean squared
                  error. Bias = mean(forecast − actual). All are in MW, not MWh.
                  Metrics use unrounded values.
                </p>
                <p>
                  National Elexon wind only; not a utility’s portfolio. No
                  demand or price data is available, so this tool does not
                  calculate purchase volumes or costs. Actuals are a downloaded
                  snapshot, not an archive of what was known at decision time.
                </p>
                <p>
                  Data provenance: backend/data/elexon/manifest.json records
                  retrieval time, exact source URLs, coverage and checksums. The
                  pilot uses a fixed historical snapshot, not live data.
                </p>
              </div>
            </details>
          </div>
        ) : null}
        <footer>
          <span>
            windward <span className="footer-separator">/</span> A day-ahead
            wind intelligence pilot
          </span>
          <span>Source: Elexon FUELHH & WINDFOR · MW · GMT</span>
        </footer>
      </main>
    </>
  );
}
