"use client";

import { useId, useState, type ChangeEvent } from "react";
import { LOCALITIES } from "@/core/localities";
import {
  COOKING,
  CONDITIONS,
  HOME_SIZES,
  MODES,
  PURIFIERS,
  SCHOOL_RUNS,
  type Profile,
} from "@/core/types";
import type { Key } from "@/i18n";
import { useT } from "../useT";

interface Props {
  profile: Profile;
  onSubmit: (next: Profile) => void;
}

const clamp = (value: string, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(Number(value)) || 0));

export function ProfileForm({ profile, onSubmit }: Props) {
  const { t } = useT();
  const [draft, setDraft] = useState<Profile>(profile);
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const patch = (next: Partial<Profile>) => setDraft((d) => ({ ...d, ...next }));
  const member =
    (key: keyof Profile["members"], max: number) => (e: ChangeEvent<HTMLInputElement>) =>
      patch({ members: { ...draft.members, [key]: clamp(e.target.value, 0, max) } });
  const toggleCondition = (c: (typeof CONDITIONS)[number]) =>
    patch({
      conditions: draft.conditions.includes(c)
        ? draft.conditions.filter((x) => x !== c)
        : [...draft.conditions, c],
    });
  const noOne =
    draft.members.infants +
      draft.members.children +
      draft.members.adults +
      draft.members.seniors ===
    0;

  return (
    <form
      className="card form"
      aria-labelledby={id("title")}
      onSubmit={(e) => {
        e.preventDefault();
        if (!noOne) onSubmit(draft);
      }}
    >
      <h2 id={id("title")}>{t("form.title")}</h2>

      <div className="field">
        <label htmlFor={id("area")}>{t("form.area")}</label>
        <select
          id={id("area")}
          value={draft.locality}
          onChange={(e) => patch({ locality: e.target.value })}
        >
          {LOCALITIES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend>{t("form.audience")}</legend>
        {(["family", "community"] as const).map((a) => (
          <label key={a} className="choice">
            <input
              type="radio"
              name={id("audience")}
              checked={draft.audience === a}
              onChange={() => patch({ audience: a })}
            />
            {t(`form.audience.${a}`)}
          </label>
        ))}
      </fieldset>

      {draft.audience === "community" && (
        <div className="field">
          <label htmlFor={id("hh")}>{t("form.households")}</label>
          <input
            id={id("hh")}
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            value={draft.households}
            onChange={(e) => patch({ households: clamp(e.target.value, 1, 5000) })}
          />
        </div>
      )}

      <fieldset>
        <legend>{t("form.members")}</legend>
        <div className="grid-2">
          {(
            [
              ["infants", "form.infants", 6],
              ["children", "form.children", 10],
              ["adults", "form.adults", 12],
              ["seniors", "form.seniors", 6],
            ] as const
          ).map(([key, label, max]) => (
            <div className="field" key={key}>
              <label htmlFor={id(key)}>{t(label)}</label>
              <input
                id={id(key)}
                type="number"
                inputMode="numeric"
                min={0}
                max={max}
                value={draft.members[key]}
                onChange={member(key, max)}
              />
            </div>
          ))}
        </div>
        {noOne && (
          <p className="error" role="alert">
            {t("form.members")}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend>{t("form.conditions")}</legend>
        <p className="hint">{t("form.conditions.hint")}</p>
        {CONDITIONS.map((c) => (
          <label key={c} className="choice">
            <input
              type="checkbox"
              checked={draft.conditions.includes(c)}
              onChange={() => toggleCondition(c)}
            />
            {t(`cond.${c}` as Key)}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>{t("form.commute")}</legend>
        <div className="field">
          <label htmlFor={id("mode")}>{t("form.mode")}</label>
          <select
            id={id("mode")}
            value={draft.commute.mode}
            onChange={(e) =>
              patch({
                commute: {
                  ...draft.commute,
                  mode: e.target.value as Profile["commute"]["mode"],
                  daysPerWeek: e.target.value === "wfh" ? 0 : draft.commute.daysPerWeek || 5,
                },
              })
            }
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {t(`mode.${m}` as Key)}
              </option>
            ))}
          </select>
        </div>
        {draft.commute.mode !== "wfh" && (
          <div className="grid-2">
            <div className="field">
              <label htmlFor={id("km")}>{t("form.km")}</label>
              <input
                id={id("km")}
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                value={draft.commute.km}
                onChange={(e) =>
                  patch({ commute: { ...draft.commute, km: clamp(e.target.value, 0, 100) } })
                }
              />
            </div>
            <div className="field">
              <label htmlFor={id("days")}>{t("form.days")}</label>
              <input
                id={id("days")}
                type="number"
                inputMode="numeric"
                min={0}
                max={7}
                value={draft.commute.daysPerWeek}
                onChange={(e) =>
                  patch({
                    commute: { ...draft.commute, daysPerWeek: clamp(e.target.value, 0, 7) },
                  })
                }
              />
            </div>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>{t("form.home")}</legend>
        <div className="grid-2">
          <div className="field">
            <label htmlFor={id("size")}>{t("form.size")}</label>
            <select
              id={id("size")}
              value={draft.home.size}
              onChange={(e) =>
                patch({ home: { ...draft.home, size: e.target.value as Profile["home"]["size"] } })
              }
            >
              {HOME_SIZES.map((s) => (
                <option key={s} value={s}>
                  {t(`size.${s}` as Key)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={id("cook")}>{t("form.cooking")}</label>
            <select
              id={id("cook")}
              value={draft.home.cooking}
              onChange={(e) =>
                patch({
                  home: { ...draft.home, cooking: e.target.value as Profile["home"]["cooking"] },
                })
              }
            >
              {COOKING.map((c) => (
                <option key={c} value={c}>
                  {t(`cook.${c}` as Key)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={id("pur")}>{t("form.purifier")}</label>
            <select
              id={id("pur")}
              value={draft.home.purifier}
              onChange={(e) =>
                patch({
                  home: { ...draft.home, purifier: e.target.value as Profile["home"]["purifier"] },
                })
              }
            >
              {PURIFIERS.map((p) => (
                <option key={p} value={p}>
                  {t(`pur.${p}` as Key)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={id("school")}>{t("form.school")}</label>
            <select
              id={id("school")}
              value={draft.lifestyle.schoolRun}
              onChange={(e) =>
                patch({
                  lifestyle: {
                    ...draft.lifestyle,
                    schoolRun: e.target.value as Profile["lifestyle"]["schoolRun"],
                  },
                })
              }
            >
              {SCHOOL_RUNS.map((s) => (
                <option key={s} value={s}>
                  {t(`school.${s}` as Key)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="choice">
          <input
            type="checkbox"
            checked={draft.home.rangeHood}
            onChange={(e) => patch({ home: { ...draft.home, rangeHood: e.target.checked } })}
          />
          {t("form.hood")}
        </label>
        <label className="choice">
          <input
            type="checkbox"
            checked={draft.lifestyle.outdoorExercise}
            onChange={(e) =>
              patch({ lifestyle: { ...draft.lifestyle, outdoorExercise: e.target.checked } })
            }
          />
          {t("form.exercise")}
        </label>
      </fieldset>

      <button type="submit" className="btn btn-primary" disabled={noOne}>
        {t("form.submit")}
      </button>
    </form>
  );
}
