"use client";

import { ChevronDownIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

/**
 * The page shell: a legend panel of controls beside the map area. On narrow
 * screens the controls come first, then the answer, then the legend.
 */
export function Sheet({
  panel,
  legend,
  children,
}: {
  panel: React.ReactNode;
  legend?: React.ReactNode;
  children: React.ReactNode;
}) {
  const side = "bg-panel px-4 sm:px-8 lg:border-r lg:border-border lg:px-6";
  return (
    <div className="mx-auto grid max-w-[90rem] lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[21rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
      <aside
        aria-label="Controls"
        className={`${side} grid content-start gap-7 py-6 max-lg:border-b max-lg:border-border lg:col-start-1 lg:row-start-1`}
      >
        {panel}
      </aside>
      <main className="grid min-w-0 content-start gap-8 px-4 py-6 sm:px-8 sm:py-8 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {children}
      </main>
      {legend && (
        <aside
          aria-label="Legend"
          className={`${side} grid content-start gap-7 pb-8 max-lg:border-t max-lg:border-border max-lg:pt-6 lg:col-start-1 lg:row-start-2`}
        >
          {legend}
        </aside>
      )}
    </div>
  );
}

/** A labelled group of controls in the legend panel. */
export function PanelGroup({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-2.5">
      <div className="grid gap-1">
        <h2
          id={id}
          className="text-xs font-bold tracking-[0.12em] text-grid-ink uppercase"
        >
          {label}
        </h2>
        {hint && (
          <p className="text-[0.8rem] leading-snug text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

/** "13:00" → "1:00 pm"; values stay 24-hour, only the label changes. */
export function twelveHour(time: string) {
  const [h, m] = time.split(":").map(Number);
  return {
    clock: `${h % 12 || 12}:${String(m).padStart(2, "0")}`,
    half: h < 12 ? "am" : "pm",
  };
}

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
            <span className="text-[0.7rem] font-medium opacity-75">{half}</span>
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

export function NoteRef({
  id,
  onOpen,
}: {
  id: number;
  onOpen: (id: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      className="ml-0.5 rounded-sm align-super text-[0.65rem] font-bold text-grid-ink hover:text-primary"
      aria-label={`Assumption ${id}`}
    >
      [{id}]
    </button>
  );
}

/** A legend line: solid or dashed rule, or a filled patch. */
export function Swatch({
  color,
  kind = "line",
}: {
  color: string;
  kind?: "line" | "dashed" | "patch";
}) {
  if (kind === "patch")
    return (
      <span
        aria-hidden="true"
        className="inline-block h-3 w-5 rounded-[2px]"
        style={{ background: color }}
      />
    );
  return (
    <span
      aria-hidden="true"
      className="inline-block h-0 w-5 border-t-[3px]"
      style={{
        borderColor: color,
        borderStyle: kind === "dashed" ? "dashed" : "solid",
      }}
    />
  );
}

/** The map key: every mark on the sheet, explained once. */
export function LegendKey({
  items,
}: {
  items: { color: string; kind?: "line" | "dashed" | "patch"; label: string }[];
}) {
  return (
    <div className="grid gap-2 rounded-[var(--radius)] border-[1.5px] border-frame bg-card px-4 py-3.5">
      <h2 className="text-xs font-bold tracking-[0.12em] uppercase">Legend</h2>
      <ul className="grid gap-2 text-sm">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5">
            <Swatch color={item.color} kind={item.kind} />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Miss depth: one fixed four-step ramp for every shaded miss on the sheet. */
export const DEPTH_STEPS = [500, 1000, 2000] as const;
export function depth(error: number) {
  const size = Math.abs(error);
  const step = DEPTH_STEPS.filter((limit) => size >= limit).length + 1;
  return `var(--${error > 0 ? "over" : "under"}-${step})`;
}

export function DepthKey() {
  const labels = ["<500", "500+", "1,000+", "2,000+"];
  return (
    <div className="grid gap-2 text-xs">
      <h2 className="font-bold tracking-[0.12em] uppercase">Miss depth · MW</h2>
      <div className="grid grid-cols-[4.25rem_repeat(4,minmax(0,1fr))] items-center gap-x-1 gap-y-1.5 text-muted-foreground">
        {(["over", "under"] as const).map((tone) => (
          <div key={tone} className="contents">
            <span className="font-medium text-foreground">
              {tone === "over" ? "Too high" : "Too low"}
            </span>
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className="h-3.5 rounded-[2px]"
                style={{ background: `var(--${tone}-${step})` }}
              />
            ))}
          </div>
        ))}
        <span />
        {labels.map((label) => (
          <span key={label} className="text-center tabular-nums">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** An ink-framed figure with its own title row. */
export function Figure({
  title,
  description,
  aside,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="grid gap-1">
          <h2 className="text-xl font-bold tracking-[-0.015em]">{title}</h2>
          {description && (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
        </div>
        {aside}
      </div>
      <div className="rounded-[var(--radius)] border-[1.5px] border-frame bg-card p-3 sm:p-4">
        {children}
      </div>
    </section>
  );
}

/** Four figures in one ruled strip. */
export function StatStrip({
  items,
}: {
  items: {
    label: React.ReactNode;
    value: React.ReactNode;
    hint: React.ReactNode;
    tone?: "over" | "under";
  }[];
}) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-[var(--radius)] border-[1.5px] border-frame bg-card lg:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            "grid content-start gap-1 border-border p-4",
            index % 2 === 0 && "border-r",
            index < 2 && "max-lg:border-b",
            index < items.length - 1 && "lg:border-r",
          )}
        >
          <span className="text-xs font-semibold text-muted-foreground">
            {item.label}
          </span>
          <strong
            className={cn(
              "text-2xl font-extrabold tracking-[-0.02em] tabular-nums sm:text-[1.75rem]",
              item.tone === "over" && "text-over-ink",
              item.tone === "under" && "text-under-ink",
            )}
          >
            {item.value}
          </strong>
          <span className="text-xs text-muted-foreground">{item.hint}</span>
        </div>
      ))}
    </div>
  );
}

/** Numbered assumptions, opened from any [n] reference on the page. */
export function NotesPanel({
  open,
  onOpenChange,
  notes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: { title: string; body: string }[];
}) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="rounded-[var(--radius)] border-[1.5px] border-frame bg-card"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left font-bold">
        Assumptions & methodology
        <ChevronDownIcon
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className="grid max-w-3xl gap-4 border-t border-border px-4 py-4 text-sm">
          {notes.map((note, index) => (
            <li
              key={note.title}
              id={`note-${index + 1}`}
              className="grid scroll-mt-24 grid-cols-[2rem_1fr] gap-x-2"
            >
              <span className="font-bold text-grid-ink tabular-nums">
                [{index + 1}]
              </span>
              <div className="grid gap-1">
                <h3 className="font-semibold">{note.title}</h3>
                <p className="leading-relaxed text-muted-foreground">
                  {note.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Scroll the assumptions panel to one note, opening it first. */
export function noteOpener(setOpen: (open: boolean) => void) {
  return (id: number) => {
    setOpen(true);
    // Wait for the panel to render before scrolling to the note.
    requestAnimationFrame(() =>
      document
        .getElementById(`note-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };
}
