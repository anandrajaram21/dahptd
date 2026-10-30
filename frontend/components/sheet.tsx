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
      {/* A trailing inset keeps a right-aligned aside off the content edge. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pe-2">
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
