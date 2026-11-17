"use client";

import { useState } from "react";
import { buildBands } from "@/core/bands";
import { describeAction } from "@/core/catalog";
import { DEFAULT_PROFILE, type Profile } from "@/core/types";
import { saveProfile, useHasSavedProfile, useProfile } from "@/store/local";
import { fetchNarrative, fetchPlan, type NarrateResponse, type PlanResponse } from "../api";
import { useNowHour } from "../useNowHour";
import { useRequest } from "../useRequest";
import { useT } from "../useT";
import { ActionList } from "./ActionList";
import { AirNow } from "./AirNow";
import { Assistant } from "./Assistant";
import { BandGrid } from "./BandGrid";
import { Drawer } from "./Drawer";
import { Outcome } from "./Outcome";
import { ProfileForm } from "./ProfileForm";
import { QuickSetup } from "./QuickSetup";
import { RightNow } from "./RightNow";
import { TabBar } from "./TabBar";
import { TodayHead } from "./TodayHead";

export function PlanApp() {
  const { t, lang } = useT();
  const [profile] = useProfile();
  const hasSaved = useHasSavedProfile();
  const nowHour = useNowHour();
  const [drawer, setDrawer] = useState(false);

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
  const update = (next: Profile) => {
    saveProfile(next);
    setDrawer(false);
  };
  // Until the household is edited, the plan is for the built-in example family, and says so.
  const isExample =
    JSON.stringify({ ...profile, language: "en" }) ===
    JSON.stringify({ ...DEFAULT_PROFILE, language: "en" });
  const planResult = plan.current;
  const narrative = words.current && "data" in words.current ? words.current.data : null;
  const data = planResult && "data" in planResult ? planResult.data : null;
  const bands = data ? buildBands(data.plan) : [];
  const first = data?.plan.actions[0];

  return (
    <div className="today" lang={lang}>
      <div className="today-main" id="today">
        <div aria-live="polite" aria-busy={!planResult}>
          {!planResult && <p className="status">{t("state.loading")}</p>}
        </div>

        {planResult && "error" in planResult && (
          <div className="alert" role="alert">
            <p>{planResult.error || t("state.error")}</p>
            <button type="button" className="btn btn-secondary" onClick={plan.retry}>
              {t("state.retry")}
            </button>
          </div>
        )}

        {data && (
          <>
            <TodayHead plan={data.plan} />
            {isExample && hasSaved && <p className="notice">{t("plan.example")}</p>}
            {data.notice && <p className="notice">{data.notice}</p>}
            <BandGrid bands={bands} nowHour={nowHour} />
            <RightNow
              bands={bands}
              nowHour={nowHour}
              firstAction={first ? describeAction(first, lang).title : null}
            />
            {!hasSaved && (
              <QuickSetup
                profile={profile}
                onDone={(next) => saveProfile(next)}
                onSkip={() => saveProfile(profile)}
              />
            )}
            <Outcome plan={data.plan} />
            <ActionList
              actions={data.plan.actions}
              narrative={narrative?.narrative ?? null}
              model={narrative?.ai ?? null}
              pending={!words.current}
            />
            <AirNow plan={data.plan} />
            <p className="edit-row">
              <button type="button" className="btn btn-secondary" onClick={() => setDrawer(true)}>
                {t("today.edit")}
              </button>
            </p>
          </>
        )}
      </div>

      {data && (
        <div className="today-side">
          <Assistant profile={profile} onChange={submit} />
        </div>
      )}

      <Drawer open={drawer} onClose={() => setDrawer(false)} title={t("form.title")}>
        <ProfileForm key={JSON.stringify(profile)} profile={profile} onSubmit={update} />
      </Drawer>
      <TabBar onHome={() => setDrawer(true)} />
    </div>
  );
}
