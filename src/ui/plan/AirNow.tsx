"use client";

import { CATEGORY_LABEL, GRAP_LABEL } from "@/core/catalog";
import type { Plan } from "@/core/plan";
import { useT } from "../useT";

const W = 480;
const H = 150;
const PAD = 22;

/** Hourly PM2.5 as bars, with a table alternative. Category is conveyed by text and pattern, not colour alone. */
function HourlyChart({ plan }: { plan: Plan }) {
  const { t, lang } = useT();
  const max = Math.max(...plan.hourly.map((h) => h.pm25), 1);
  const bar = (W - PAD) / 24;
  const worst = plan.worstHours.join(", ");
  const summary = `${t("air.chart.title")}: ${t("air.cleanest", { hour: plan.cleanestHour })}. ${t("air.worst", { hours: worst })}.`;

  return (
    <figure className="chart">
      <figcaption>{t("air.chart.title")}</figcaption>
      <svg viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={summary} className="chart-svg">
        {plan.hourly.map((h) => {
          const height = Math.max(2, (h.pm25 / max) * H);
          const isWorst = plan.worstHours.includes(h.hour);
          const isBest = h.hour === plan.cleanestHour;
          return (
            <rect
              key={h.hour}
              x={PAD + h.hour * bar}
              y={H - height}
              width={bar - 3}
              height={height}
              rx={2}
              className={`bar cat-${h.category}${isWorst ? " bar-worst" : ""}${isBest ? " bar-best" : ""}`}
            />
          );
        })}
        {[0, 6, 12, 18].map((hour) => (
          <text key={hour} x={PAD + hour * bar} y={H + 14} className="axis" aria-hidden="true">
            {hour}:00
          </text>
        ))}
      </svg>
      <details className="table-toggle">
        <summary>{t("air.chart.table")}</summary>
        <div className="table-wrap" tabIndex={0} role="region" aria-label={t("air.chart.table")}>
          <table lang={lang}>
            <thead>
              <tr>
                <th scope="col">{t("air.hour")}</th>
                <th scope="col">
                  {t("air.pm25")} ({t("air.unit")})
                </th>
                <th scope="col">{t("air.aqi")}</th>
              </tr>
            </thead>
            <tbody>
              {plan.hourly.map((h) => (
                <tr key={h.hour}>
                  <th scope="row">{h.hour}:00</th>
                  <td>{Math.round(h.pm25)}</td>
                  <td>
                    {h.aqi} · {CATEGORY_LABEL[h.category][lang]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

export function AirNow({ plan }: { plan: Plan }) {
  const { t, lang } = useT();
  return (
    <section className="card air" aria-labelledby="air-title">
      <h2 id="air-title">{t("air.title", { area: plan.locality })}</h2>
      <div className={`aqi-badge cat-${plan.category}`}>
        <p className="aqi-number" aria-label={`${t("air.aqi")} ${plan.meanAqi}`}>
          {plan.meanAqi}
        </p>
        <p className="aqi-label">
          <span className="sr-only">{t("air.aqi")}: </span>
          {CATEGORY_LABEL[plan.category][lang]}
        </p>
      </div>
      <dl className="facts">
        <div>
          <dt>{t("air.pm25")}</dt>
          <dd>
            {plan.meanPm25} {t("air.unit")}
          </dd>
        </div>
        <div>
          <dt>GRAP</dt>
          <dd>{GRAP_LABEL[plan.grap]?.[lang]}</dd>
        </div>
      </dl>
      <p className="hint">{t("air.grap")}</p>
      <p className={plan.source === "live" ? "source live" : "source sample"}>
        {plan.source === "live" ? t("air.live") : t("air.sample")}
      </p>
      <HourlyChart plan={plan} />
    </section>
  );
}
