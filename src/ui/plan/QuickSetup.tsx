"use client";

import { useId, useState } from "react";
import { LOCALITIES } from "@/core/localities";
import type { Profile } from "@/core/types";
import type { Key } from "@/i18n";
import { useT } from "../useT";

type Who = "adults" | "kids" | "elders" | "both";
type Move = "car" | "two_wheeler" | "metro" | "home";

const WHO: Record<Who, Profile["members"]> = {
  adults: { infants: 0, children: 0, adults: 2, seniors: 0 },
  kids: { infants: 0, children: 1, adults: 2, seniors: 0 },
  elders: { infants: 0, children: 0, adults: 2, seniors: 1 },
  both: { infants: 0, children: 1, adults: 2, seniors: 1 },
};

const MOVE: Record<Move, Profile["commute"]> = {
  car: { mode: "car", km: 12, daysPerWeek: 5 },
  two_wheeler: { mode: "two_wheeler", km: 12, daysPerWeek: 5 },
  metro: { mode: "metro", km: 12, daysPerWeek: 5 },
  home: { mode: "wfh", km: 0, daysPerWeek: 0 },
};

/** Three quick questions that turn the example household into yours. Everything else stays editable. */
export function QuickSetup({
  profile,
  onDone,
  onSkip,
}: {
  profile: Profile;
  onDone: (next: Profile) => void;
  onSkip: () => void;
}) {
  const { t } = useT();
  const uid = useId();
  const [step, setStep] = useState(1);
  const [area, setArea] = useState(profile.locality);
  const [who, setWho] = useState<Who>("both");
  const [move, setMove] = useState<Move>("two_wheeler");

  const finish = () =>
    onDone({ ...profile, locality: area, members: WHO[who], commute: MOVE[move] });

  return (
    <section className="setup" aria-labelledby={`${uid}-title`}>
      <h2 id={`${uid}-title`}>{t("setup.title")}</h2>
      <p className="setup-step">{t("setup.step", { n: step })}</p>

      {step === 1 && (
        <div className="field">
          <label htmlFor={`${uid}-area`}>{t("setup.area")}</label>
          <select id={`${uid}-area`} value={area} onChange={(e) => setArea(e.target.value)}>
            {LOCALITIES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {step === 2 && (
        <fieldset className="choices">
          <legend>{t("setup.who")}</legend>
          {(Object.keys(WHO) as Who[]).map((key) => (
            <label key={key} className="choice">
              <input
                type="radio"
                name={`${uid}-who`}
                checked={who === key}
                onChange={() => setWho(key)}
              />
              {t(`setup.who.${key}` as Key)}
            </label>
          ))}
        </fieldset>
      )}

      {step === 3 && (
        <fieldset className="choices">
          <legend>{t("setup.move")}</legend>
          {(Object.keys(MOVE) as Move[]).map((key) => (
            <label key={key} className="choice">
              <input
                type="radio"
                name={`${uid}-move`}
                checked={move === key}
                onChange={() => setMove(key)}
              />
              {t(`setup.move.${key}` as Key)}
            </label>
          ))}
        </fieldset>
      )}

      <div className="row setup-actions">
        {step > 1 && (
          <button type="button" className="btn btn-quiet" onClick={() => setStep(step - 1)}>
            {t("setup.back")}
          </button>
        )}
        {step < 3 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}>
            {t("setup.next")}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={finish}>
            {t("setup.finish")}
          </button>
        )}
        <button type="button" className="link-button" onClick={onSkip}>
          {t("setup.skip")}
        </button>
      </div>
    </section>
  );
}
