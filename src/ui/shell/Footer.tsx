"use client";

import { useT } from "../useT";

export function Footer() {
  const { t } = useT();
  return (
    <footer className="site-footer">
      <p>{t("disclaimer")}</p>
      <p>{t("footer.data")}</p>
    </footer>
  );
}
