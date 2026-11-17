"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/core/types";
import { saveProfile, useProfile } from "@/store/local";
import { fetchNarrative, fetchPlan, type NarrateResponse, type PlanResponse } from "../api";
import { useT } from "../useT";
import { ActionList } from "./ActionList";
import { AirNow } from "./AirNow";
import { Assistant } from "./Assistant";
import { Outcome } from "./Outcome";
import { ProfileForm } from "./ProfileForm";

type Result<T> = { key: string; data: T } | { key: string; error: string };

/** Runs `load` whenever `key` changes, keeping the latest answer tagged with the key it answers. */
function useRequest<T>(key: string, load: (signal: AbortSignal) => Promise<T>, fallback: string) {
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

export function PlanApp() {
  const { t, lang } = useT();
  const [profile] = useProfile();

  // The numbers don't depend on the display language; the AI's wording does.
  const plan = useRequest<PlanResponse>(
    JSON.stringify({ ...profile, language: "en" }),
    (signal) => fetchPlan(profile, signal),
    t("state.error"),
  );
  const words = useRequest<NarrateResponse>(
    JSON.stringify(profile),
    (signal) => fetchNarrative(profile, signal),
    t("state.error"),
  );

  const submit = (next: Profile) => saveProfile(next);
  const planResult = plan.current;
  const narrative = words.current && "data" in words.current ? words.current.data : null;

  return (
    <div className="plan-layout" lang={lang}>
      <aside aria-label={t("form.title")}>
        <ProfileForm key={JSON.stringify(profile)} profile={profile} onSubmit={submit} />
      </aside>

      <div className="plan-main">
        <div aria-live="polite" aria-busy={!planResult}>
          {!planResult && <p className="status">{t("state.loading")}</p>}
        </div>

        {planResult && "error" in planResult && (
          <div className="card" role="alert">
            <p>{planResult.error || t("state.error")}</p>
            <button type="button" className="btn btn-secondary" onClick={plan.retry}>
              {t("state.retry")}
            </button>
          </div>
        )}

        {planResult && "data" in planResult && (
          <>
            {planResult.data.notice && <p className="notice">{planResult.data.notice}</p>}
            <AirNow plan={planResult.data.plan} />
            <Outcome plan={planResult.data.plan} />
            <ActionList
              actions={planResult.data.plan.actions}
              narrative={narrative?.narrative ?? null}
              model={narrative?.ai ?? null}
              pending={!words.current}
            />
            <Assistant profile={profile} onChange={submit} />
          </>
        )}
      </div>
    </div>
  );
}
