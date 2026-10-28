import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Test Vercel's compiled routes, not just the source configuration. Run after
// `vercel build --prod`; schema validation cannot catch a non-matching regex.
const config = JSON.parse(
  readFileSync(new URL("../.vercel/output/config.json", import.meta.url), "utf8"),
);

for (const [path, expected] of [
  ["/", "frontend"],
  ["/index", "frontend"],
  ["/dashboard", "frontend"],
  ["/_next/static/example.js", "frontend"],
  ["/api/health", "backend"],
  ["/api/docs", "backend"],
  ["/api/openapi.json", "backend"],
  ["/api/missing", "backend"],
]) {
  const route = config.routes.find(
    (rule) => rule.destination?.service && new RegExp(rule.src).test(path),
  );
  assert.equal(route?.destination.service, expected, `${path} must reach ${expected}`);
  console.log(`${path} → ${expected}`);
}
