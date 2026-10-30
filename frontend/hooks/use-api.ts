"use client";

import { useEffect, useState } from "react";

/**
 * Fetch JSON from the API whenever `url` changes. The previous response stays
 * visible while the next one loads, so the page doesn't jump.
 */
export function useApi<T>(url: string, failure: string) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; error?: string } | null>(
    null,
  );
  const [data, setData] = useState<T | null>(null);
  const key = `${url}#${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(failure);
        return response.json() as Promise<T>;
      })
      .then((next) => {
        setResult({ key });
        setData(next);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error:
              error instanceof Error
                ? error.message
                : "Unable to connect to the API.",
          });
      });
    return () => controller.abort();
  }, [url, failure, key]);

  return {
    data,
    loading: result?.key !== key,
    error: result?.key === key ? result.error : undefined,
    retry: () => setAttempt((value) => value + 1),
  };
}
