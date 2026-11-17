"use client";

import { BAND_HOURS, bandAt, type Band } from "@/core/bands";
import { useT } from "../useT";

/** What to do in this very band, the cleanest window to aim for, and the first action to take. */
export function RightNow({
  bands,
  nowHour,
  firstAction,
}: {
  bands: Band[];
  nowHour: number | null;
  firstAction: string | null;
}) {
  const { t } = useT();
  const current = nowHour === null ? undefined : bandAt(bands, nowHour);
  const best = bands.find((b) => b.kind === "best");
  return (
    <section className="now-strip" aria-labelledby="now-title">
      <h2 id="now-title">{t("now.title")}</h2>
      {current && <p className="now-main">{t(`now.${current.kind}`)}</p>}
      {best && (
        <p className="now-line">
          {t("now.next", { from: best.startHour, to: best.startHour + BAND_HOURS })}
        </p>
      )}
      {firstAction && <p className="now-line">{t("now.first", { action: firstAction })}</p>}
    </section>
  );
}
