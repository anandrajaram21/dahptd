import { InfoIcon } from "lucide-react";

export type ReleaseInfo = {
  // Clock time of the forecast in use, e.g. "15:30"; null if none yet.
  release: string | null;
  // Neighbouring whole-hour cutoffs that use exactly the same forecast.
  sameFrom: string | null;
  sameTo: string | null;
  // Regular release times, e.g. ["02:30", "04:30", ...].
  schedule: string[];
};

/** The run of cutoffs around `selected` that share the same `key`. */
export function sameRun<T extends { cutoff: string }>(
  rows: T[],
  selected: string,
  key: (row: T) => string,
) {
  const index = rows.findIndex((row) => row.cutoff === selected);
  if (index < 0) return { sameFrom: null, sameTo: null };
  let [first, last] = [index, index];
  while (first > 0 && key(rows[first - 1]) === key(rows[index])) first--;
  while (last < rows.length - 1 && key(rows[last + 1]) === key(rows[index]))
    last++;
  return { sameFrom: rows[first].cutoff, sameTo: rows[last].cutoff };
}

/** Explains that forecasts are released a few times a day, not hourly. */
export function ReleaseNotice({
  release,
  sameFrom,
  sameTo,
  schedule,
}: ReleaseInfo) {
  const shared = release && sameFrom && sameTo && sameFrom !== sameTo;
  return (
    <div
      role="status"
      className="grid gap-1.5 rounded-[var(--radius)] border-[1.5px] border-grid-ink/50 bg-card px-3.5 py-3 text-sm"
    >
      <p className="flex items-center gap-2 font-bold">
        <InfoIcon aria-hidden="true" className="size-4 shrink-0 text-grid-ink" />
        {release ? `Uses the ${release} release` : "No forecast published yet"}
      </p>
      {shared && (
        <p className="font-medium">
          Cutoffs {sameFrom}–{sameTo} all give identical results.
        </p>
      )}
      <p className="text-[0.8rem] leading-snug text-muted-foreground">
        Elexon publishes {schedule.length} times a day ({schedule.join(", ")}{" "}
        GMT), not every hour. Blue-marked hours are the first cutoff after each
        release.
      </p>
    </div>
  );
}
