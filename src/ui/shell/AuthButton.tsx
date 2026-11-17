"use client";

import type { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { signOutUser, watchAuth } from "@/store/auth";
import { firebaseEnabled } from "@/store/firebase";
import { AuthDialog } from "../auth/AuthDialog";
import { useT } from "../useT";

/** Set once someone has signed in, so Firebase loads on later visits only for people who use it. */
const SESSION_HINT = "saans.signedIn";

function hadSession(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT) === "1";
  } catch {
    return false;
  }
}

function rememberSession(on: boolean): void {
  try {
    if (on) localStorage.setItem(SESSION_HINT, "1");
    else localStorage.removeItem(SESSION_HINT);
  } catch {
    // Storage blocked: sign-in still works, it just isn't restored on the next visit.
  }
}

/**
 * Sign in (Google, or email and password) to keep the household across devices. Hidden unless Firebase
 * is configured. The Firebase SDK is not downloaded until the dialog opens, or someone returns after
 * having signed in before.
 */
export function AuthButton() {
  const { t } = useT();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const stop = useRef<(() => void) | null>(null);

  /** Starts following the sign-in state. Safe to call again: it replaces the previous watcher. */
  async function follow() {
    try {
      const unsubscribe = await watchAuth((next) => {
        setUser(next);
        rememberSession(next !== null);
      });
      stop.current?.();
      stop.current = unsubscribe;
    } catch {
      // Firebase unreachable: the household still works on this device.
    }
  }

  useEffect(() => {
    if (firebaseEnabled && hadSession()) void follow();
    return () => stop.current?.();
  }, []);

  if (!firebaseEnabled) return null;

  if (user) {
    const label = user.email ?? user.displayName ?? "";
    return (
      <div className="account">
        <span className="avatar" aria-hidden="true">
          {(label[0] ?? "?").toUpperCase()}
        </span>
        <span className="account-text">
          <span className="sr-only">{t("auth.signedAs", { email: label })}</span>
          <span aria-hidden="true">{label}</span>
        </span>
        <button type="button" className="btn btn-secondary" onClick={() => void signOutUser()}>
          {t("auth.signout")}
        </button>
        <span className="sr-only" role="status">
          {t("auth.synced")}
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => {
          setOpen(true);
          void follow();
        }}
      >
        {t("auth.signin")}
      </button>
      {open && <AuthDialog onClose={() => setOpen(false)} />}
    </>
  );
}
