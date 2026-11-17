"use client";

import { useT } from "../useT";

export function SkipLink() {
  const { t } = useT();
  return (
    <a href="#main" className="skip-link">
      {t("skip")}
    </a>
  );
}
