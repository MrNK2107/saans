"use client";

import { useT } from "../useT";

/** Phone navigation: jump to a section, or open the household drawer. Hidden once the layout has room. */
export function TabBar({ onHome }: { onHome: () => void }) {
  const { t } = useT();
  return (
    <nav className="tabbar" aria-label={t("nav.label")}>
      <a href="#today">{t("nav.today")}</a>
      <a href="#air">{t("nav.air")}</a>
      <a href="#ask">{t("nav.ask")}</a>
      <button type="button" onClick={onHome}>
        {t("nav.home")}
      </button>
    </nav>
  );
}
