import { beforeEach, describe, expect, it, vi } from "vitest";

const mod = vi.hoisted(() => {
  const setCustomParameters = vi.fn();
  return {
    setCustomParameters,
    GoogleAuthProvider: vi.fn(function Provider(this: { setCustomParameters: unknown }) {
      this.setCustomParameters = setCustomParameters;
    }),
    signInWithPopup: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
  };
});
const cloud = vi.hoisted(() => ({ startSync: vi.fn(), stopSync: vi.fn() }));
const firebase = vi.hoisted(() => ({ getFirebase: vi.fn() }));

vi.mock("firebase/auth", () => mod);
vi.mock("./cloud", () => cloud);
vi.mock("./firebase", () => firebase);

import {
  AuthFailure,
  codeOf,
  sendReset,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  signUpWithEmail,
  watchAuth,
} from "./auth";

const AUTH = { name: "auth" };

beforeEach(() => {
  vi.clearAllMocks();
  firebase.getFirebase.mockResolvedValue({ auth: AUTH });
  cloud.startSync.mockResolvedValue(undefined);
});

describe("codeOf", () => {
  it("reads Firebase codes and falls back for anything else", () => {
    expect(codeOf({ code: "auth/popup-blocked" })).toBe("auth/popup-blocked");
    expect(codeOf(new AuthFailure("auth/x"))).toBe("auth/x");
    expect(codeOf(new Error("boom"))).toBe("auth/unknown");
    expect(codeOf(null)).toBe("auth/unknown");
  });
});

describe("sign-in calls", () => {
  it("asks Google to let the person pick an account", async () => {
    mod.signInWithPopup.mockResolvedValue({});
    await signInWithGoogle();
    expect(mod.setCustomParameters).toHaveBeenCalledWith({ prompt: "select_account" });
    expect(mod.signInWithPopup).toHaveBeenCalledWith(AUTH, expect.anything());
  });

  it("passes email and password through", async () => {
    await signInWithEmail("a@b.co", "pw-12345");
    await signUpWithEmail("a@b.co", "pw-12345");
    await sendReset("a@b.co");
    await signOutUser();
    expect(mod.signInWithEmailAndPassword).toHaveBeenCalledWith(AUTH, "a@b.co", "pw-12345");
    expect(mod.createUserWithEmailAndPassword).toHaveBeenCalledWith(AUTH, "a@b.co", "pw-12345");
    expect(mod.sendPasswordResetEmail).toHaveBeenCalledWith(AUTH, "a@b.co");
    expect(mod.signOut).toHaveBeenCalledWith(AUTH);
  });

  it("turns any Firebase error into an AuthFailure with its code", async () => {
    mod.signInWithEmailAndPassword.mockRejectedValue({ code: "auth/invalid-credential" });
    await expect(signInWithEmail("a@b.co", "x")).rejects.toMatchObject({
      name: "AuthFailure",
      code: "auth/invalid-credential",
    });
  });

  it("fails clearly when Firebase isn't configured", async () => {
    firebase.getFirebase.mockResolvedValue(null);
    await expect(signInWithGoogle()).rejects.toMatchObject({ code: "auth/not-configured" });
  });
});

describe("watchAuth", () => {
  it("reports the user, syncs while signed in, and stops cleanly", async () => {
    const stopFirebase = vi.fn();
    let listener: (user: unknown) => void = () => {};
    mod.onAuthStateChanged.mockImplementation((_auth, cb) => {
      listener = cb;
      return stopFirebase;
    });
    const seen: unknown[] = [];
    const stop = await watchAuth((u) => seen.push(u));

    listener({ uid: "u1" });
    expect(cloud.startSync).toHaveBeenCalledWith({ uid: "u1" });
    listener(null);
    expect(cloud.stopSync).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([{ uid: "u1" }, null]);

    stop();
    expect(stopFirebase).toHaveBeenCalledOnce();
    expect(cloud.stopSync).toHaveBeenCalledTimes(2);
  });

  it("never lets a sync failure break sign-in", async () => {
    cloud.startSync.mockRejectedValue(new Error("offline"));
    let listener: (user: unknown) => void = () => {};
    mod.onAuthStateChanged.mockImplementation((_auth, cb) => {
      listener = cb;
      return vi.fn();
    });
    await watchAuth(() => {});
    expect(() => listener({ uid: "u1" })).not.toThrow();
  });
});
