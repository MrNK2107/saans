"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Key } from "@/i18n";
import {
  codeOf,
  sendReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/store/auth";
import { useT } from "../useT";
import { EMAIL_PATTERN, MIN_PASSWORD, authErrorKey } from "./errors";
import { GoogleLogo } from "./GoogleLogo";

type Mode = "in" | "up";
type Note = { kind: "error" | "info"; key: Key; params?: Record<string, string> };

/**
 * Sign in or create an account, with Google or an email and password. Mounted only while open, so
 * every visit starts clean. The native <dialog> traps focus, closes on Escape and restores focus.
 */
export function AuthDialog({ onClose }: { onClose: () => void }) {
  const { t, lang } = useT();
  const uid = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const emailField = useRef<HTMLInputElement>(null);
  const passwordField = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => {
      if (el?.open) el.close();
    };
  }, []);

  const fail = (error: unknown) => {
    const key = authErrorKey(codeOf(error));
    // Name the address Firebase refused, so the fix (adding it to the allowed list) is obvious.
    const params = key === "auth.err.domain" ? { host: window.location.hostname } : undefined;
    setNote(key ? { kind: "error", key, params } : null);
  };

  /** Runs one sign-in step, closing the dialog on success and explaining any failure. */
  async function attempt(step: () => Promise<void>) {
    setBusy(true);
    setNote(null);
    try {
      await step();
      dialog.current?.close();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setNote({ kind: "error", key: "auth.err.email" });
      emailField.current?.focus();
      return;
    }
    if (mode === "up" && password.length < MIN_PASSWORD) {
      setNote({ kind: "error", key: "auth.err.weak" });
      passwordField.current?.focus();
      return;
    }
    if (mode === "in" && password.length === 0) {
      setNote({ kind: "error", key: "auth.err.required" });
      passwordField.current?.focus();
      return;
    }
    void attempt(() =>
      mode === "in" ? signInWithEmail(address, password) : signUpWithEmail(address, password),
    );
  }

  async function reset() {
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setNote({ kind: "error", key: "auth.err.email" });
      emailField.current?.focus();
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      await sendReset(address);
      setNote({ kind: "info", key: "auth.reset.sent", params: { email: address } });
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  }

  const switchMode = () => {
    setMode((m) => (m === "in" ? "up" : "in"));
    setNote(null);
  };
  const noteId = `${uid}-note`;
  const invalidEmail = note?.kind === "error" && note.key === "auth.err.email";
  const invalidPassword =
    note?.kind === "error" && (note.key === "auth.err.weak" || note.key === "auth.err.required");

  return (
    <dialog
      ref={dialog}
      className="auth-dialog"
      aria-labelledby={`${uid}-title`}
      lang={lang}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === dialog.current) dialog.current?.close();
      }}
    >
      <div className="auth-body">
        <div className="auth-head">
          <h2 id={`${uid}-title`}>{t("auth.title")}</h2>
          <button
            type="button"
            className="btn btn-quiet btn-icon"
            aria-label={t("auth.close")}
            onClick={() => dialog.current?.close()}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <p className="hint">{t("auth.lede")}</p>

        <button
          type="button"
          className="btn btn-google"
          disabled={busy}
          onClick={() => void attempt(signInWithGoogle)}
        >
          <GoogleLogo />
          {t("auth.google")}
        </button>

        <div className="divider">
          <span>{t("auth.or")}</span>
        </div>

        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor={`${uid}-email`}>{t("auth.email")}</label>
            <input
              id={`${uid}-email`}
              ref={emailField}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={invalidEmail}
              aria-describedby={invalidEmail ? noteId : undefined}
            />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-password`}>{t("auth.password")}</label>
            <input
              id={`${uid}-password`}
              ref={passwordField}
              type="password"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={invalidPassword}
              aria-describedby={invalidPassword ? noteId : undefined}
            />
            {mode === "up" && <span className="hint">{t("auth.password.hint")}</span>}
          </div>

          {note && (
            <p
              id={noteId}
              role={note.kind === "error" ? "alert" : "status"}
              className={note.kind === "error" ? "error" : "notice"}
            >
              {t(note.key, note.params)}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t("auth.busy") : mode === "in" ? t("auth.mode.in") : t("auth.mode.up")}
          </button>
        </form>

        <div className="auth-links">
          {mode === "in" && (
            <button type="button" className="link-button" disabled={busy} onClick={reset}>
              {t("auth.forgot")}
            </button>
          )}
          <button type="button" className="link-button" onClick={switchMode}>
            {mode === "in" ? t("auth.switch.toUp") : t("auth.switch.toIn")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
