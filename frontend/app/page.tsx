import { HealthCheck } from "./health-check";

export default function Home() {
  return (
    <main>
      <p className="eyebrow">UK WIND · JANUARY 2026 PILOT</p>
      <h1>Wind forecast explorer</h1>
      <p className="intro">A foundation for reviewing the wind forecasts available at purchase decision time, and measuring their accuracy against actual generation.</p>
      <section aria-labelledby="status-heading">
        <h2 id="status-heading">Scaffold ready</h2>
        <p>Next.js frontend and Python API, deployed together. Forecast data and analysis are not implemented yet.</p>
        <HealthCheck />
      </section>
      <p className="footnote">Planned source: Elexon WINDFOR forecasts and FUELHH wind actuals. No sample values are presented as real data.</p>
    </main>
  );
}
