import type { User } from "firebase/auth";
import { getFirebase } from "./firebase";

/** A failed sign-in step, carrying Firebase's error code so the UI can explain it in plain words. */
export class AuthFailure extends Error {
  override name = "AuthFailure";
  constructor(readonly code: string) {
    super(code);
  }
}

/** The `auth/...` code from any thrown value, or a stable fallback. */
export function codeOf(error: unknown): string {
  if (error instanceof AuthFailure) return error.code;
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : "auth/unknown";
}

/** Loads the Firebase SDK on first use; nothing is downloaded until someone signs in. */
async function load() {
  const fb = await getFirebase();
  if (!fb) throw new AuthFailure("auth/not-configured");
  return { auth: fb.auth, mod: await import("firebase/auth") };
}

async function wrap<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw new AuthFailure(codeOf(error));
  }
}

export const signInWithGoogle = () =>
  wrap(async () => {
    const { auth, mod } = await load();
    const provider = new mod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await mod.signInWithPopup(auth, provider);
  });

export const signInWithEmail = (email: string, password: string) =>
  wrap(async () => {
    const { auth, mod } = await load();
    await mod.signInWithEmailAndPassword(auth, email, password);
  });

export const signUpWithEmail = (email: string, password: string) =>
  wrap(async () => {
    const { auth, mod } = await load();
    await mod.createUserWithEmailAndPassword(auth, email, password);
  });

export const sendReset = (email: string) =>
  wrap(async () => {
    const { auth, mod } = await load();
    await mod.sendPasswordResetEmail(auth, email);
  });

export const signOutUser = () =>
  wrap(async () => {
    const { auth, mod } = await load();
    await mod.signOut(auth);
  });

/**
 * Follows the sign-in state and keeps the household in sync while signed in. Returns a function that
 * stops following. Sync trouble never blocks sign-in: the household is always kept on the device too.
 */
export async function watchAuth(onUser: (user: User | null) => void): Promise<() => void> {
  const { auth, mod } = await load();
  const { startSync, stopSync } = await import("./cloud");
  const stop = mod.onAuthStateChanged(auth, (user) => {
    onUser(user);
    if (user) startSync(user).catch(() => {});
    else stopSync();
  });
  return () => {
    stop();
    stopSync();
  };
}
