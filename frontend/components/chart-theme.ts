import { useSyncExternalStore } from "react";
import type { ChartConfig } from "@/components/ui/chart";

// Theme tokens from globals.css, so both light and dark sheets recolour.
export const chartConfig = {
  forecast: { label: "Forecast", color: "var(--forecast)" },
  actual: { label: "Actual", color: "var(--actual)" },
  over: { label: "Forecast too high", color: "var(--over)" },
  under: { label: "Forecast too low", color: "var(--under)" },
} satisfies ChartConfig;

export const GRID_STROKE = "var(--grid)";
export const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };

/** Animate only when the visitor hasn't asked for reduced motion. */
export function useMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => !matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** Miss depth: one fixed four-step ramp for every shaded miss on the sheet. */
export const DEPTH_STEPS = [500, 1000, 2000] as const;
export function depth(error: number) {
  const size = Math.abs(error);
  const step = DEPTH_STEPS.filter((limit) => size >= limit).length + 1;
  return `var(--${error > 0 ? "over" : "under"}-${step})`;
}
