import { useSyncExternalStore } from "react";
import { DEFAULT_PROFILE, ProfileSchema, type Profile } from "@/core/types";

const KEY = "saans.profile.v1";
const listeners = new Set<() => void>();

/** Reads the saved household. Tampered or outdated data is ignored rather than trusted. */
export function loadProfile(
  storage: Pick<Storage, "getItem"> | undefined = safeStorage(),
): Profile {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = ProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(
  profile: Profile,
  storage: Pick<Storage, "setItem"> | undefined = safeStorage(),
): void {
  try {
    storage?.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Private mode or a full disk: the plan still works, it just isn't remembered.
  }
  listeners.forEach((l) => l());
}

export function hasSavedProfile(
  storage: Pick<Storage, "getItem"> | undefined = safeStorage(),
): boolean {
  try {
    return Boolean(storage?.getItem(KEY));
  } catch {
    return false;
  }
}

/** Calls `listener` after each save on this device; used to push changes to the cloud when signed in. */
export function onProfileSaved(listener: (profile: Profile) => void): () => void {
  const wrapped = () => listener(loadProfile());
  listeners.add(wrapped);
  return () => listeners.delete(wrapped);
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

let cachedRaw: string | null | undefined;
let cachedProfile: Profile = DEFAULT_PROFILE;

/** A referentially stable snapshot, as useSyncExternalStore requires. */
function snapshot(): Profile {
  const raw = safeStorage()?.getItem(KEY) ?? null;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedProfile = loadProfile();
  }
  return cachedProfile;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** The household profile, remembered on this device. */
export function useProfile(): [Profile, (next: Profile) => void] {
  const profile = useSyncExternalStore(subscribe, snapshot, () => DEFAULT_PROFILE);
  return [profile, saveProfile];
}
