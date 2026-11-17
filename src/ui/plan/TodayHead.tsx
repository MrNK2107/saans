"use client";

import { CATEGORY_LABEL } from "@/core/catalog";
import type { Plan } from "@/core/plan";
import { useT } from "../useT";

/** The date, and the day's verdict in one line: how bad it is and the number behind it. */
export function TodayHead({ plan, level = 1 }: { plan: Plan; level?: 1 | 2 }) {
  const { t, lang } = useT();
  const date = new Date(`${plan.date}T00:00:00Z`).toLocaleDateString(
    lang === "hi" ? "hi-IN" : "en-IN",
    { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" },
  );
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className={`today-head cat-${plan.category}`}>
      <p className="today-date">{t("today.date", { date })}</p>
      <Heading className="today-verdict">
        {t("today.verdict", { category: CATEGORY_LABEL[plan.category][lang], aqi: plan.meanAqi })}
      </Heading>
    </div>
  );
}
