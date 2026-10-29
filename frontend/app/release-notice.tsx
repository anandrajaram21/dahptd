import { InfoIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
    <Alert className="border-[#3987e5]/40 bg-[#3987e5]/10">
      <InfoIcon />
      <AlertTitle>
        {release
          ? `Uses the ${release} forecast`
          : "No forecast published by this cutoff"}
        {shared && ` · ${sameFrom}–${sameTo} all give identical results`}
      </AlertTitle>
      <AlertDescription>
        Elexon publishes {schedule.length} times a day ({schedule.join(", ")}{" "}
        GMT), not every hour. Any cutoff between two releases picks the same
        forecast, so nearby cutoffs often match.
      </AlertDescription>
    </Alert>
  );
}
