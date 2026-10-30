export const DEFAULT_CUTOFF = "10:00";
export const cutoffs = Array.from(
  { length: 24 },
  (_, hour) => `${String(hour).padStart(2, "0")}:00`,
);

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
