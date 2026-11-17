"use client";

import type { Action, Group } from "@/core/actions";
import { actionHour } from "@/core/bands";
import { describeAction, impactChips } from "@/core/catalog";
import type { Narrative } from "@/ai/contracts";
import { useT } from "../useT";

const ORDER: Group[] = ["routine", "indoor", "commute", "community"];

/** Narrative priorities lead; everything else follows in the engine's own order. */
function ordered(actions: Action[], narrative: Narrative | null): Action[] {
  if (!narrative) return actions;
  const rank = new Map(narrative.priorities.map((p, i) => [p.id, i]));
  return [...actions].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
}

export function ActionList({
  actions,
  narrative,
  model,
  pending,
}: {
  actions: Action[];
  narrative: Narrative | null;
  model: string | null;
  pending: boolean;
}) {
  const { t, lang } = useT();
  const sorted = ordered(actions, narrative);
  const reasons = new Map(narrative?.priorities.map((p) => [p.id, p.reason]));

  return (
    <section aria-labelledby="plan-title" className="actions">
      <h2 id="plan-title">{t("plan.title")}</h2>
      {narrative && (
        <div className="narrative">
          <h3>{narrative.headline}</h3>
          <p>{narrative.summary}</p>
          <p className="hint">{t("plan.ai", { model: model ?? "AI" })}</p>
        </div>
      )}
      {!narrative && (
        <p className="hint" role="status">
          {pending ? t("plan.writing") : t("plan.noai")}
        </p>
      )}

      {ORDER.map((group) => {
        const items = sorted.filter((a) => a.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="group">
            <h3>{t(`plan.group.${group}`)}</h3>
            <ul className="timeline">
              {items.map((action) => {
                const { title, body } = describeAction(action, lang);
                const reason = reasons.get(action.id);
                const hour = actionHour(action);
                return (
                  <li key={action.id} className="action">
                    <p className="action-time">
                      {hour === null ? t("time.any") : t("time.at", { hour })}
                    </p>
                    <div className="action-body">
                      <h4>{title}</h4>
                      <p>{body}</p>
                      {reason && <p className="why">{t("plan.why", { reason })}</p>}
                      <ul className="chips" aria-label="Impact">
                        {impactChips(action, lang).map((chip) => (
                          <li key={chip} className="chip chip-impact">
                            {chip}
                          </li>
                        ))}
                        <li className="chip">{t(`plan.cost.${action.cost}`)}</li>
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
