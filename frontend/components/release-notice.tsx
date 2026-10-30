import { InfoIcon } from "lucide-react";
import type { ReleaseInfo } from "@/lib/cutoffs";
import { twelveHour } from "@/lib/format";

// "09:30" → "9:30 am", inside any label such as "11:30 (12:25 on 1 day)".
const twelve = (text: string) =>
  text.replace(/\b(\d{2}:\d{2})\b/g, (time) => {
    const { clock, half } = twelveHour(time);
    return `${clock} ${half}`;
  });

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
        <InfoIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-grid-ink"
        />
        {release
          ? `Uses the ${twelve(release)} release`
          : "No forecast published yet"}
      </p>
      {shared && (
        <p className="font-medium">
          Cutoffs {twelve(sameFrom)}–{twelve(sameTo)} all give identical
          results.
        </p>
      )}
      <p className="text-[0.8rem] leading-snug text-muted-foreground">
        Elexon publishes {schedule.length} times a day (
        {twelve(schedule.join(", "))} GMT), not every hour. Blue-marked times
        are the first cutoff after each release.
      </p>
    </div>
  );
}
