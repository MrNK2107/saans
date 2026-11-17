"use client";

import Link from "next/link";
import { useEffect } from "react";
import { saveProfile, useProfile } from "@/store/local";
import { useT } from "../useT";
import { AuthButton } from "./AuthButton";
import { Logo } from "./Logo";

/** Keeps <html lang> in step with the chosen language, so screen readers pronounce Hindi correctly. */
function LangSync() {
  const { lang } = useT();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}

export function Header() {
  const { t } = useT();
  const [profile] = useProfile();
  const other = profile.language === "en" ? "hi" : "en";
  return (
    <header className="site-header">
      <LangSync />
      <Link href="/" className="brand">
        <Logo />
        <span className="brand-name">{t("app.name")}</span>
      </Link>
      <nav className="header-actions" aria-label="Site">
        <button
          type="button"
          className="btn btn-quiet"
          lang={other}
          aria-label={t("lang.label")}
          onClick={() => saveProfile({ ...profile, language: other })}
        >
          {t("lang.switch")}
        </button>
        <AuthButton />
      </nav>
    </header>
  );
}
