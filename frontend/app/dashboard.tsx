"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import WindChart from "./wind-chart";
import {
  analysisCsv,
  biasDescription,
  dates,
  dayLabel,
  deliveryDate,
  differenceLabel,
  hourLabel,
  number,
  publicationLabel,
  readSettings,
  scenarios,
  settingsQuery,
  shortDayLabel,
  validTime,
  type DashboardData,
  type DayReview,
  type Metrics,
  type Settings,
} from "./dashboard-data";

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

function AccuracySummary({ metrics }: { metrics: Metrics }) {
  return (
    <section aria-label="Forecast accuracy summary">
      <div className="summary-grid">
        <div>
          <span>
            Average absolute difference{" "}
            <abbr title="Mean absolute error">MAE</abbr>
          </span>
          <strong>
            {number(metrics.mae)} <small>MW</small>
          </strong>
          <p>The size of a miss, in either direction.</p>
        </div>
        <div>
          <span>
            Average{" "}
            {metrics.bias === null || metrics.bias === 0
              ? "signed difference"
              : metrics.bias < 0
                ? "underestimate"
                : "overestimate"}
          </span>
          <strong>
            {number(metrics.bias === null ? null : Math.abs(metrics.bias))}{" "}
            <small>MW</small>
          </strong>
          <p>Signed average (bias); opposite errors can cancel.</p>
        </div>
        <div>
          <span>Hours compared</span>
          <strong>
            {metrics.matched_hours} <small>/ {metrics.expected_hours}</small>
          </strong>
          <p>Only hours with both forecast and actual output.</p>
        </div>
      </div>
      <p className="accuracy-explanation">{biasDescription(metrics)}</p>
      {metrics.matched_hours > 0 && (
        <p className="supporting-copy">
          Forecast above actual in {metrics.overestimated_hours} hours; below in{" "}
          {metrics.underestimated_hours}; equal in {metrics.equal_hours}.
        </p>
      )}
    </section>
  );
}

function HourlyValues({
  data,
  review,
}: {
  data: DashboardData;
  review: boolean;
}) {
  return (
    <details className="disclosure" key={review ? "review" : "forecast"}>
      <summary>
        Hourly values <span>24 delivery hours</span>
      </summary>
      <div className="table-scroll">
        <table>
          <caption>
            {review ? "Retrospective comparison" : "Decision-time forecast"} ·{" "}
            {dayLabel(data.delivery_date)} · MW · GMT. Missing values are shown
            as —.
          </caption>
          <thead>
            <tr>
              <th scope="col">Hour starting</th>
              <th scope="col">Forecast published</th>
              <th scope="col">Forecast MW</th>
              {review && (
                <>
                  <th scope="col">Actual MW</th>
                  <th scope="col">Forecast vs actual</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.points.map((point) => (
              <tr key={point.start_time}>
                <th scope="row">{hourLabel(point.start_time)}</th>
                <td>
                  {point.publish_time
                    ? publicationLabel(point.publish_time)
                    : "—"}
                </td>
                <td>{number(point.forecast)}</td>
                {review && (
                  <>
                    <td>{number(point.actual)}</td>
                    <td>{differenceLabel(point.error)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function DataDetails({ data }: { data: DashboardData }) {
  return (
    <details className="disclosure">
      <summary>Data & calculation details</summary>
      <div className="method">
        <h2>What this pilot covers</h2>
        <p>
          GB operational-metered wind from Elexon: WINDFOR forecasts and FUELHH
          wind outturn. Not all UK wind, embedded generation, or a utility’s own
          portfolio. No purchase quantities or costs are calculated.
        </p>
        <h2>Forecast selection & planning time</h2>
        <p>
          For each delivery hour, use the latest source publication at or before
          the decision time. Later updates are excluded. Source publication time
          approximates availability; it does not establish receipt at a trading
          desk.
        </p>
        <p>
          Example planning times are five minutes before the normal morning
          auction close: Nord Pool 09:45 (close 09:50 GMT), EPEX 09:15 (close
          09:20 GMT). These buffers are illustrative, not exchange rules or an
          approved execution workflow. Confirm the client’s venue and allow for
          data and order-submission delays.
        </p>
        <p>
          <a
            href="https://www.nordpoolgroup.com/4ab576/globalassets/download-center/rules-and-regulations/product-specifications-gb-market.pdf"
            target="_blank"
            rel="noreferrer"
          >
            Nord Pool GB specifications ↗
          </a>{" "}
          ·{" "}
          <a
            href="https://www.epexspot.com/sites/default/files/2025-02/EPEX%20SPOT%20Trading%20Brochure%202025%20February.pdf"
            target="_blank"
            rel="noreferrer"
          >
            EPEX 2025 trading brochure ↗
          </a>
        </p>
        <h2>Alignment assumption</h2>
        <p>
          Each hourly WINDFOR value is treated as the mean for its starting
          hour. Actual output is the mean of the two corresponding FUELHH
          half-hours; both are required. FUELHH is half-hourly average MW.
          WINDFOR’s interval-average convention and exact historical population
          equivalence still require publisher confirmation. Scores are
          conditional on this alignment.
        </p>
        <h2>Retrospective evaluation, not predictive confidence</h2>
        <p>
          Error = forecast − actual: positive means wind was overestimated. MAE
          averages absolute errors. Bias averages signed errors. RMSE gives more
          weight to large misses. Monthly scores pool matched hourly errors;
          missing values are never zero. All scores are MW, not MWh.
        </p>
        <p>
          Recorded output can reflect curtailment, availability and telemetry,
          not just weather forecast errors. These aggregate data cannot
          attribute the causes. Historical errors are not confidence intervals
          or a suggested buying margin.
        </p>
        <p>
          Actuals are an operational-outturn snapshot retrieved{" "}
          {dayLabel(data.snapshot.retrieved_at)}, not settlement-final data or a
          complete archive of what was known in January. No prior-error
          calibration or historical confidence band is claimed.
        </p>
        <h2>Snapshot provenance</h2>
        <p>
          Retrieved {publicationLabel(data.snapshot.retrieved_at)}. Original UTC
          publication times are preserved, even where documentation’s advertised
          schedule differs.
        </p>
        <p>
          <a
            href="https://bmrs.elexon.co.uk/wind-generation"
            target="_blank"
            rel="noreferrer"
          >
            Elexon wind forecasts ↗
          </a>{" "}
          ·{" "}
          <a
            href="https://bmrs.elexon.co.uk/generation-by-fuel-type"
            target="_blank"
            rel="noreferrer"
          >
            Elexon generation outturn ↗
          </a>
        </p>
        {Object.entries(data.snapshot.files).map(([name, file]) => (
          <p key={name} className="checksum">
            {file.dataset} · SHA-256 <code>{file.sha256}</code>
          </p>
        ))}
      </div>
    </details>
  );
}

export default function Dashboard() {
  const searchParams = useSearchParams();
  const settings = readSettings(searchParams);
  const { date, cutoff, scenario, view, period } = settings;
  const review = view === "accuracy";
  const month = review && period === "month";
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: DashboardData;
    error?: string;
  } | null>(null);
  const key = `${date}/${cutoff}/${retry}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/dashboard?decision_date=${date}&cutoff=${cutoff}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "Wind analysis could not be loaded. Check the connection and try again.",
          );
        return response.json() as Promise<DashboardData>;
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
  const index = dates.indexOf(date);
  const preset = scenario === "custom" ? null : scenarios[scenario];
  const worstDay = data?.month_days.reduce<DayReview | null>(
    (worst, day) =>
      day.metrics.mae !== null &&
      (worst === null || day.metrics.mae > (worst.metrics.mae ?? -1))
        ? day
        : worst,
    null,
  );
  const maxDailyError = Math.max(1, worstDay?.metrics.mae ?? 0);

  function update(changes: Partial<Settings>) {
    window.history.pushState(
      null,
      "",
      `?${settingsQuery({ ...settings, ...changes })}`,
    );
  }

  function download() {
    if (!data) return;
    const url = URL.createObjectURL(
      new Blob([analysisCsv(data, settings)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `dahptd-${month ? "january-decisions" : date}-${cutoff.replace(":", "")}-${view}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to analysis
      </a>
      <header className="masthead">
        <Link className="wordmark" href="/">
          dahptd
        </Link>
        <span>
          GB wind <span className="header-divider">/</span> Historical pilot ·
          January 2026
        </span>
      </header>
      <main id="main" className="main-workspace">
        <nav className="workspace-nav" aria-label="Analysis views">
          <button
            aria-pressed={!review}
            onClick={() => update({ view: "forecast" })}
          >
            Wind forecast
          </button>
          <button
            aria-pressed={review}
            onClick={() => update({ view: "accuracy" })}
          >
            Forecast accuracy
          </button>
        </nav>

        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {review ? "Retrospective review" : "Available at decision time"}
            </p>
            <h1>
              {month
                ? "How did January’s forecasts perform?"
                : `${review ? "Wind forecast vs actual for" : "Wind for"} ${dayLabel(deliveryDate(date))}`}
            </h1>
          </div>
          {review && (
            <div
              className="segmented-control"
              role="group"
              aria-label="Accuracy period"
            >
              <button
                aria-pressed={period === "day"}
                onClick={() => update({ period: "day" })}
              >
                One day
              </button>
              <button
                aria-pressed={period === "month"}
                onClick={() => update({ period: "month" })}
              >
                January decisions
              </button>
            </div>
          )}
        </div>

        <section className="decision-context" aria-label="Decision context">
          {!month ? (
            <div className="date-control">
              <label htmlFor="decision-date">Decision date</label>
              <div className="date-input">
                <button
                  aria-label="Previous decision day"
                  disabled={index === 0}
                  onClick={() => update({ date: dates[index - 1] })}
                >
                  <Arrow back />
                </button>
                <select
                  id="decision-date"
                  value={date}
                  onChange={(event) => update({ date: event.target.value })}
                >
                  {dates.map((value) => (
                    <option key={value} value={value}>
                      {dayLabel(value)}
                    </option>
                  ))}
                </select>
                <button
                  aria-label="Next decision day"
                  disabled={index === 30}
                  onClick={() => update({ date: dates[index + 1] })}
                >
                  <Arrow />
                </button>
              </div>
            </div>
          ) : (
            <p>
              Decisions <b>1–31 January 2026</b>
              <br />
              <span>Delivery 2 January–1 February 2026</span>
            </p>
          )}
          <div className="scenario-context">
            <p>
              As of <b>{cutoff} GMT</b> on{" "}
              {month ? "each decision day" : dayLabel(date)}
            </p>
            <span>
              {preset
                ? `${preset.label} · example planning time · closes ${preset.closes} GMT`
                : "Custom research time · not an auction deadline"}
            </span>
          </div>
          <details className="scenario-settings">
            <summary>Change scenario</summary>
            <div className="settings-fields">
              <label htmlFor="scenario">Planning scenario</label>
              <select
                id="scenario"
                value={scenario}
                onChange={(event) => {
                  const value = event.target.value as Settings["scenario"];
                  update({
                    scenario: value,
                    cutoff:
                      value === "custom" ? cutoff : scenarios[value].cutoff,
                  });
                }}
              >
                <option value="nord">Nord Pool hourly · plan at 09:45</option>
                <option value="epex">EPEX hourly · plan at 09:15</option>
                <option value="custom">Custom research time</option>
              </select>
              {scenario === "custom" && (
                <>
                  <label htmlFor="cutoff">Decision time · GMT</label>
                  <input
                    id="cutoff"
                    type="time"
                    value={cutoff}
                    onChange={(event) => {
                      if (validTime(event.target.value))
                        update({ cutoff: event.target.value });
                    }}
                  />
                </>
              )}
              <p>
                Example buffers are not exchange rules. Confirm the client’s
                venue and submission workflow.
              </p>
            </div>
          </details>
        </section>

        {error ? (
          <div className="request-error" role="alert">
            <h2>Analysis unavailable</h2>
            <p>{error}</p>
            <button
              className="button"
              onClick={() => setRetry((value) => value + 1)}
            >
              Retry request
            </button>
          </div>
        ) : !data ? (
          <div className="loading-workspace" role="status">
            Loading wind analysis…
          </div>
        ) : (
          <>
            {!month &&
              data.forecast_summary.available_hours <
                data.forecast_summary.expected_hours && (
                <p className="coverage-warning" role="status">
                  {data.forecast_summary.available_hours === 0
                    ? "No forecasts were published by this decision time."
                    : `Forecast available for ${data.forecast_summary.available_hours}/${data.forecast_summary.expected_hours} hours.`}{" "}
                  Try another decision date or time. Missing forecasts remain
                  gaps.
                </p>
              )}
            {review &&
              (month ? data.month_metrics : data.metrics).matched_hours <
                (month ? data.month_metrics : data.metrics).expected_hours && (
                <p className="coverage-warning" role="status">
                  Incomplete comparison:{" "}
                  {(month ? data.month_metrics : data.metrics).matched_hours}/
                  {(month ? data.month_metrics : data.metrics).expected_hours}{" "}
                  matched hours. Missing pairs are excluded, not treated as
                  zero.
                </p>
              )}

            {!review ? (
              <>
                <p className="publication-context">
                  {data.forecast_summary.publication_times.length === 1 ? (
                    <>
                      Forecast published{" "}
                      <b>
                        {publicationLabel(
                          data.forecast_summary.publication_times[0],
                        )}
                      </b>
                    </>
                  ) : data.forecast_summary.publication_times.length > 1 ? (
                    <>
                      Latest eligible forecasts use{" "}
                      <b>
                        {data.forecast_summary.publication_times.length}{" "}
                        publication times
                      </b>{" "}
                      · see hourly values
                    </>
                  ) : (
                    "No eligible forecast publication"
                  )}
                  <span>
                    {data.forecast_summary.available_hours}/
                    {data.forecast_summary.expected_hours} hours available
                  </span>
                </p>
                <div
                  className="summary-grid"
                  role="group"
                  aria-label="Wind forecast summary"
                >
                  <div>
                    <span>
                      Average generation
                      {data.forecast_summary.available_hours < 24
                        ? " · available hours"
                        : ""}
                    </span>
                    <strong>
                      {number(data.forecast_summary.mean)} <small>MW</small>
                    </strong>
                  </div>
                  <div>
                    <span>
                      Lowest forecast
                      {data.forecast_summary.lowest
                        ? ` · ${hourLabel(data.forecast_summary.lowest.start_time)}`
                        : ""}
                    </span>
                    <strong>
                      {number(data.forecast_summary.lowest?.forecast ?? null)}{" "}
                      <small>MW</small>
                    </strong>
                  </div>
                  <div>
                    <span>
                      Highest forecast
                      {data.forecast_summary.highest
                        ? ` · ${hourLabel(data.forecast_summary.highest.start_time)}`
                        : ""}
                    </span>
                    <strong>
                      {number(data.forecast_summary.highest?.forecast ?? null)}{" "}
                      <small>MW</small>
                    </strong>
                  </div>
                </div>
                <section
                  className="chart-section"
                  aria-label="Day-ahead wind forecast"
                >
                  <h2>Expected wind through the delivery day</h2>
                  <WindChart points={data.points} review={false} />
                </section>
                <div className="review-prompt">
                  <div>
                    <h2>How did this forecast turn out?</h2>
                    <p>
                      Actual output and forecast errors are available in
                      retrospective review.
                    </p>
                  </div>
                  <button
                    className="button"
                    onClick={() => update({ view: "accuracy", period: "day" })}
                  >
                    Review actual outcome <span aria-hidden="true">→</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="review-notice">
                  Actual output is hindsight, not information available when
                  buying. Scores use the stated hourly alignment assumption.
                </p>
                <AccuracySummary
                  metrics={month ? data.month_metrics : data.metrics}
                />
                {month ? (
                  <section
                    className="daily-review"
                    aria-label="Daily forecast performance"
                  >
                    <div className="section-heading">
                      <h2>Where were the largest misses?</h2>
                      <p>
                        Average absolute difference by delivery day · select a
                        row to review
                      </p>
                    </div>
                    {worstDay && (
                      <p className="worst-day">
                        <button
                          className="text-button"
                          onClick={() =>
                            update({
                              date: worstDay.decision_date,
                              period: "day",
                            })
                          }
                        >
                          Largest daily miss: {dayLabel(worstDay.delivery_date)}{" "}
                          · {number(worstDay.metrics.mae)} MW{" "}
                          <span aria-hidden="true">→</span>
                        </button>
                      </p>
                    )}
                    <div className="table-scroll">
                      <table className="daily-table">
                        <caption>
                          All 31 January purchase decisions, using {cutoff} GMT
                          each day. Bars show relative MAE, not confidence or
                          risk.
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Delivery day · 2026</th>
                            <th scope="col">
                              Average absolute difference · MW
                            </th>
                            <th scope="col">Hours compared</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.month_days.map((day) => (
                            <tr key={day.decision_date}>
                              <th scope="row">
                                <button
                                  onClick={() =>
                                    update({
                                      date: day.decision_date,
                                      period: "day",
                                    })
                                  }
                                  aria-label={`Review delivery ${dayLabel(day.delivery_date)}`}
                                >
                                  {shortDayLabel(day.delivery_date)}{" "}
                                  <span aria-hidden="true">↗</span>
                                </button>
                              </th>
                              <td>
                                <div className="error-bar-row">
                                  <span
                                    className="error-bar"
                                    style={{
                                      width: `${day.metrics.mae === null ? 0 : (day.metrics.mae / maxDailyError) * 100}%`,
                                    }}
                                  />
                                  <span>{number(day.metrics.mae)}</span>
                                </div>
                              </td>
                              <td>
                                {day.metrics.matched_hours}/
                                {day.metrics.expected_hours}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : (
                  <section
                    className="chart-section"
                    aria-label="Forecast compared with actual output"
                  >
                    <h2>Forecast vs recorded output</h2>
                    <WindChart points={data.points} review />
                  </section>
                )}
                <p className="supporting-copy">
                  Overestimating wind means less wind arrived than expected. It
                  does not establish how much this utility needed to buy.
                </p>
                <details className="disclosure">
                  <summary>More accuracy measures</summary>
                  <div className="method">
                    <p>
                      Root mean squared error (RMSE):{" "}
                      <b>
                        {number(
                          (month ? data.month_metrics : data.metrics).rmse,
                        )}{" "}
                        MW
                      </b>
                      . This measure gives more weight to large misses.
                    </p>
                    <p>
                      Forecast coverage:{" "}
                      {
                        (month ? data.month_metrics : data.metrics)
                          .forecast_hours
                      }
                      /
                      {
                        (month ? data.month_metrics : data.metrics)
                          .expected_hours
                      }{" "}
                      hours. Actual coverage:{" "}
                      {(month ? data.month_metrics : data.metrics).actual_hours}
                      /
                      {
                        (month ? data.month_metrics : data.metrics)
                          .expected_hours
                      }{" "}
                      hours.
                    </p>
                  </div>
                </details>
              </>
            )}

            <div className="data-actions">
              <span>
                {month ? "Daily review data" : "Inspect or keep this analysis"}
              </span>
              <button className="text-button" onClick={download}>
                Download {month ? "daily" : "hourly"} CSV{" "}
                <span aria-hidden="true">↓</span>
              </button>
            </div>
            {!month && <HourlyValues data={data} review={review} />}
            <DataDetails data={data} />
            <footer>
              <span>Elexon · GB operational-metered wind · MW · GMT</span>
              <span>
                Fixed snapshot · retrieved{" "}
                {dayLabel(data.snapshot.retrieved_at)}
              </span>
            </footer>
          </>
        )}
      </main>
    </>
  );
}
