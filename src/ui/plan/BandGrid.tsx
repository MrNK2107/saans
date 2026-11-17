"use client";

import { BAND_HOURS, type Band } from "@/core/bands";
import { useT } from "../useT";

/** The day as eight named bands, read like a wall almanac. Meaning is in the words, never colour alone. */
export function BandGrid({ bands, nowHour }: { bands: Band[]; nowHour: number | null }) {
  const { t } = useT();
  return (
    <section className="band-section" aria-labelledby="band-title">
      <h2 id="band-title" className="band-heading">
        {t("band.title")}
      </h2>
      <ol className="bands">
        {bands.map((band) => {
          const current = nowHour !== null && nowHour >= band.startHour && nowHour < band.endHour;
          return (
            <li
              key={band.index}
              className={`band band-${band.kind}${current ? " band-current" : ""}`}
              aria-current={current ? "time" : undefined}
            >
              <span className="band-time">
                {t("band.range", { from: band.startHour, to: band.startHour + BAND_HOURS })}
              </span>
              <span className="band-name">{t(`band.${band.kind}`)}</span>
              <span className="band-aqi">{t("band.aqi", { aqi: band.aqi })}</span>
              {current && <span className="band-now">{t("band.now")}</span>}
            </li>
          );
        })}
      </ol>
      <p className="hint">{t("band.key")}</p>
    </section>
  );
}
