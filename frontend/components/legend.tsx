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
