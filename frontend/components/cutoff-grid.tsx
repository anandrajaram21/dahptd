"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { twelveHour } from "@/lib/format";
import { cn } from "@/lib/utils";

const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Whole-hour cutoffs as a grid of 12-hour times. Hours that are the first to see a new
 * release carry a blue mark, so the publication rhythm is visible at a glance.
 */
export function CutoffGrid({
  cutoffs,
  value,
  releases,
  onChange,
}: {
  cutoffs: string[];
  value: string;
  releases: string[];
  onChange: (cutoff: string) => void;
}) {
  const releaseFor = (cutoff: string) =>
    releases.find(
      (r) => minutes(r) > minutes(cutoff) - 60 && minutes(r) <= minutes(cutoff),
    );
  return (
    <ToggleGroup
      aria-label="Cutoff time, GMT"
      spacing={0}
      value={[value]}
      onValueChange={(next: string[]) => {
        if (next[0]) onChange(next[0]);
      }}
      className="grid w-full grid-cols-4 overflow-hidden rounded-[var(--radius)] border-[1.5px] border-frame bg-card"
    >
      {cutoffs.map((time, index) => {
        const release = releaseFor(time);
        const { clock, half } = twelveHour(time);
        return (
          <ToggleGroupItem
            key={time}
            value={time}
            aria-label={`${clock} ${half}`}
            title={
              release
                ? `${clock} ${half}: first cutoff to use the ${release} release`
                : `${clock} ${half} (${time} GMT)`
            }
            className={cn(
              "relative h-10 w-full min-w-0 gap-1 rounded-none! border-border px-0 text-[0.8rem] font-semibold tabular-nums",
              "hover:bg-accent hover:text-accent-foreground",
              "data-pressed:bg-primary data-pressed:text-primary-foreground",
              index % 4 !== 3 && "border-r",
              index < cutoffs.length - 4 && "border-b",
              release && "text-grid-ink",
            )}
          >
            {clock}
            <span className="text-[0.7rem] font-medium">{half}</span>
            {release && (
              <span
                aria-hidden="true"
                className="absolute top-1 right-1 size-1.5 rounded-full bg-current"
              />
            )}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
