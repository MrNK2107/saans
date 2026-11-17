"use client";

import Link from "next/link";
import { useT } from "../useT";

const STEPS = ["home.step1", "home.step2", "home.step3"] as const;

export function Home() {
  const { t, lang } = useT();
  return (
    <div className="home" lang={lang}>
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">{t("app.tagline")}</p>
        <h1 id="hero-title">{t("home.title")}</h1>
        <p className="lede">{t("home.lede")}</p>
        <Link href="/plan" className="btn btn-primary btn-large">
          {t("home.cta")}
        </Link>
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
