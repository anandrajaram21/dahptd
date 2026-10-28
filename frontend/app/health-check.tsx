"use client";

import { useState } from "react";

export function HealthCheck() {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function check() {
    setState("loading");
    try {
      const response = await fetch("/api/health", {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("API unavailable");
      const body: unknown = await response.json();
      if (typeof body !== "object" || body === null || !("status" in body) || body.status !== "ok") {
        throw new Error("Unexpected API response");
      }
      setState("ok");
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <button type="button" disabled={state === "loading"} onClick={check}>
        {state === "loading" ? "Checking…" : "Check backend connection"}
      </button>
      <p role="status" aria-live="polite">
        {state === "ok" ? "Connected to FastAPI." : state === "error" ? "Cannot reach the API. Check the backend and try again." : "The API is called only when you check — no background polling."}
      </p>
    </div>
  );
}
