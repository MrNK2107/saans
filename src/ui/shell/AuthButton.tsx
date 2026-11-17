"use client";

import type { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { firebaseEnabled, getFirebase } from "@/store/firebase";
import { useT } from "../useT";

/** Set after a successful sign-in, so Firebase loads on later visits only for people who use it. */
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
    // Storage blocked: sign-in still works, it just isn't restored next visit.
  }
}

/**
 * Google sign-in to sync the household across devices. Hidden unless Firebase is configured. The
 * Firebase SDK is not downloaded until someone signs in, or returns after having signed in before.
 */
export function AuthButton() {
  const { t } = useT();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState(false);
  const stopWatching = useRef<() => void>(() => {});

  /** Starts following the sign-in state, and syncing while signed in. Safe to call once per visit. */
  async function watch() {
    const fb = await getFirebase();
    if (!fb) return;
    const { onAuthStateChanged } = await import("firebase/auth");
    const { startSync, stopSync } = await import("@/store/cloud");
    stopWatching.current();
    const unsubscribe = onAuthStateChanged(fb.auth, (next) => {
      setUser(next);
      if (next) startSync(next).catch(() => setError(true));
      else stopSync();
    });
    stopWatching.current = unsubscribe;
  }

  useEffect(() => {
    if (firebaseEnabled && hadSession()) void watch();
    return () => stopWatching.current();
  }, []);

  if (!firebaseEnabled) return null;

  async function signIn() {
    setError(false);
    try {
      const fb = await getFirebase();
      if (!fb) return;
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      await signInWithPopup(fb.auth, new GoogleAuthProvider());
      rememberSession(true);
      await watch();
    } catch {
      setError(true);
    }
  }

  async function signOut() {
    const fb = await getFirebase();
    if (fb) await (await import("firebase/auth")).signOut(fb.auth);
    rememberSession(false);
  }

  return (
    <div>
      <button type="button" className="btn btn-secondary" onClick={user ? signOut : signIn}>
        {user ? t("auth.signout") : t("auth.signin")}
      </button>
      <span className="sr-only" role="status">
        {error ? t("auth.error") : user ? t("auth.synced") : ""}
      </span>
    </div>
  );
}
