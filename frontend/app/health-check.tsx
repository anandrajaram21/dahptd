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
      <button
        className="cursor-pointer rounded-lg bg-emerald-800 px-5 py-3 text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 disabled:cursor-wait disabled:opacity-60"
        type="button"
        disabled={state === "loading"}
        onClick={check}
      >
        {state === "loading" ? "Checking…" : "Check backend connection"}
      </button>
      <p className="mt-4 text-sm leading-relaxed text-emerald-800" role="status" aria-live="polite">
        {state === "ok" ? "Connected to FastAPI." : state === "error" ? "Cannot reach the API. Check the backend and try again." : "The API is called only when you check — no background polling."}
      </p>
    </div>
  );
}
