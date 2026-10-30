import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const deck = readFileSync(
  new URL("../../presentation/index.html", import.meta.url),
  "utf8",
);
const tokens = (text: string) =>
  Object.fromEntries(
    [...text.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]),
  );
const linear = (hex: string) =>
  hex.slice(1).match(/../g)!.map((channel) => {
    const c = parseInt(channel, 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
const luminance = (hex: string) => {
  const [r, g, b] = linear(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Machado et al. (2009), full-severity deuteranopia, applied in linear RGB.
// A regression guard for this palette, not a clinical accessibility guarantee.
const simulated = (hex: string) => {
  const rgb = linear(hex);
  return [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ].map((row) => {
    const c = Math.max(0, Math.min(1, row.reduce((s, v, i) => s + v * rgb[i], 0)));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  });
};

for (const [mode, block] of [
  ["light", css.split(":root {")[1].split("\n}")[0]],
  ["dark", css.split(".dark {")[1].split("\n}")[0]],
] as const) {
  const palette = tokens(block);
  describe(`${mode} error palette`, () => {
    test("calendar labels have at least 4.5:1 contrast at every depth", () => {
      for (let step = 1; step <= 4; step++) {
        const text = step === 4
          ? mode === "dark" ? palette.background : "#ffffff"
          : palette.foreground;
        const values = [luminance(text), luminance(palette[`over-${step}`])];
        expect((Math.max(...values) + 0.05) / (Math.min(...values) + 0.05))
          .toBeGreaterThanOrEqual(4.5);
      }
    });

    test("direction text has at least 4.5:1 contrast on sheet surfaces", () => {
      for (const ink of ["over-ink", "under-ink"]) {
        for (const surface of ["background", "card", "panel"]) {
          const values = [luminance(palette[ink]), luminance(palette[surface])];
          const contrast = (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
          expect(contrast).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    test("all depth pairs stay separated under deuteranopia simulation", () => {
      for (let step = 1; step <= 4; step++) {
        const high = simulated(palette[`over-${step}`]);
        const low = simulated(palette[`under-${step}`]);
        const distance = Math.hypot(...high.map((v, i) => v - low[i]));
        expect(distance).toBeGreaterThan(0.1);
      }
    });

    test("miss-depth luminance is monotonic in both directions", () => {
      for (const direction of ["over", "under"]) {
        for (let step = 1; step < 4; step++) {
          const difference =
            luminance(palette[`${direction}-${step + 1}`]) -
            luminance(palette[`${direction}-${step}`]);
          expect(mode === "dark" ? difference : -difference).toBeGreaterThan(0);
        }
      }
    });
  });
}

test("presentation uses the same error tokens as the light dashboard", () => {
  const light = tokens(css.split(".dark {")[0]);
  for (const [name, value] of Object.entries(tokens(deck))) {
    if (name.startsWith("over") || name.startsWith("under")) {
      expect(value).toBe(light[name]);
    }
  }
});
