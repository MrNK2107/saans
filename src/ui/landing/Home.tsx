"use client";

import Link from "next/link";
import { useId } from "react";
import { buildBands } from "@/core/bands";
import { LOCALITIES } from "@/core/localities";
import { saveProfile, useProfile } from "@/store/local";
import { fetchPlan, type PlanResponse } from "../api";
import { BandGrid } from "../plan/BandGrid";
import { TodayHead } from "../plan/TodayHead";
import { useNowHour } from "../useNowHour";
import { useRequest } from "../useRequest";
import { useT } from "../useT";

const STEPS = ["home.step1", "home.step2", "home.step3"] as const;

export function Home() {
  const { t, lang } = useT();
  const uid = useId();
  const [profile] = useProfile();
  const nowHour = useNowHour();
  const air = useRequest<PlanResponse>(
    profile.locality,
    (signal) => fetchPlan(profile, signal),
    t("state.error"),
  );
  const plan = air.current && "data" in air.current ? air.current.data.plan : null;

  return (
    <div className="home" lang={lang}>
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">{t("home.title")}</h1>
        <p className="lede">{t("home.lede")}</p>
        <Link href="/plan" className="btn btn-primary btn-large">
          {t("home.cta")}
        </Link>
      </section>

      <section className="live" aria-label={t("air.title", { area: plan?.locality ?? "" })}>
        <div className="field">
          <label htmlFor={`${uid}-area`}>{t("setup.area")}</label>
          <select
            id={`${uid}-area`}
            value={profile.locality}
            onChange={(e) => saveProfile({ ...profile, locality: e.target.value })}
          >
            {LOCALITIES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        {plan ? (
          <>
            <TodayHead plan={plan} level={2} />
            <BandGrid bands={buildBands(plan)} nowHour={nowHour} />
          </>
        ) : (
          <p className="status" role="status">
            {air.current ? t("state.error") : t("state.loading")}
          </p>
        )}
      </section>

      <section aria-labelledby="how-title" className="how">
        <h2 id="how-title">{t("home.how")}</h2>
        <ol className="steps">
          {STEPS.map((step, i) => (
            <li key={step}>
              <span className="step-number" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{t(`${step}.title`)}</h3>
              <p>{t(`${step}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="honest-title" className="honest">
        <h2 id="honest-title">{t("home.honest.title")}</h2>
        <p>{t("home.honest.body")}</p>
      </section>
    </div>
  );
}
