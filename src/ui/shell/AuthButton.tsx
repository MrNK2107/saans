"use client";

import type { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { firebaseEnabled, getFirebase } from "@/store/firebase";
import { useT } from "../useT";

/** Google sign-in to sync the household across devices. Hidden unless Firebase is configured. */
export function AuthButton() {
  const { t } = useT();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!firebaseEnabled) return;
    let unsubscribe = () => {};
    void (async () => {
      const fb = await getFirebase();
      if (!fb) return;
      const { onAuthStateChanged } = await import("firebase/auth");
      const { startSync, stopSync } = await import("@/store/cloud");
      unsubscribe = onAuthStateChanged(fb.auth, (next) => {
        setUser(next);
        if (next) startSync(next).catch(() => setError(true));
        else stopSync();
      });
    })();
    return () => unsubscribe();
  }, []);

  if (!firebaseEnabled) return null;

  async function signIn() {
    setError(false);
    try {
      const fb = await getFirebase();
      if (!fb) return;
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      await signInWithPopup(fb.auth, new GoogleAuthProvider());
    } catch {
      setError(true);
    }
  }

  async function signOut() {
    const fb = await getFirebase();
    if (fb) await (await import("firebase/auth")).signOut(fb.auth);
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
