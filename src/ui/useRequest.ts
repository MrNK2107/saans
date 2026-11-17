"use client";

import { useEffect, useState } from "react";

export type Result<T> = { key: string; data: T } | { key: string; error: string };

/** Runs `load` whenever `key` changes, keeping the latest answer tagged with the key it answers. */
export function useRequest<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  fallback: string,
) {
  const [result, setResult] = useState<Result<T> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const tagged = `${key}#${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((data) => setResult({ key: tagged, data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ key: tagged, error: error instanceof Error ? error.message : fallback });
      });
    return () => controller.abort();
    // `load` and `fallback` are rebuilt every render; the request should rerun only when the key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagged]);

  return { current: result?.key === tagged ? result : null, retry: () => setAttempt((n) => n + 1) };
}
