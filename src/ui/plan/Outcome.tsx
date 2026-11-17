"use client";

import { CATEGORY_LABEL } from "@/core/catalog";
import type { Outcome as OutcomeData, Plan } from "@/core/plan";
import { useT } from "../useT";

const W = 300;

function Bars({ outcome }: { outcome: OutcomeData }) {
  const { t, lang } = useT();
  const max = Math.max(outcome.before.meanConc, 1);
  const rows = [
    { label: t("out.before"), conc: outcome.before.meanConc, cat: outcome.beforeCategory },
    { label: t("out.after"), conc: outcome.after.meanConc, cat: outcome.afterCategory },
  ];
  return (
    <ul className="bars">
      {rows.map((row) => (
        <li key={row.label}>
          <span className="bar-label">{row.label}</span>
          <svg viewBox={`0 0 ${W} 16`} className="meter" aria-hidden="true">
            <rect x={0} y={0} width={W} height={16} rx={8} className="meter-track" />
            <rect
              x={0}
              y={0}
              width={Math.max(10, (row.conc / max) * W)}
              height={16}
              rx={8}
              className={`cat-${row.cat}`}
            />
          </svg>
          <span className="bar-value">
            {Math.round(row.conc)} {t("air.unit")} · {CATEGORY_LABEL[row.cat][lang]}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Outcome({ plan }: { plan: Plan }) {
  const { t } = useT();
  return (
    <section className="card" aria-labelledby="out-title">
      <h2 id="out-title">{t("out.title")}</h2>
      <div className="outcomes">
        {plan.outcomes.map((o) => (
          <article key={o.persona} className="outcome">
            <h3>{t(`out.${o.persona}`)}</h3>
            <p className="big">{t("out.less", { pct: Math.max(0, o.reductionPct) })}</p>
            <p className="hint">{t("out.mean")}</p>
            <Bars outcome={o} />
          </article>
        ))}
      </div>
      <p className="hint">{t("out.note")}</p>
    </section>
  );
}
