import type { User } from "firebase/auth";
import { ProfileSchema, type Profile } from "@/core/types";
import { getFirebase } from "./firebase";
import { hasSavedProfile, loadProfile, onProfileSaved, saveProfile } from "./local";

/**
 * Firestore layout: households/{uid} = { ownerId, data: Profile, updatedAt }.
 * Only the signed-in owner can read or write their document (see firestore.rules).
 */
export interface HouseholdRecord {
  ownerId: string;
  data: Profile;
  updatedAt: string;
}

export function toRecord(ownerId: string, profile: Profile, now = new Date()): HouseholdRecord {
  return { ownerId, data: JSON.parse(JSON.stringify(profile)), updatedAt: now.toISOString() };
}

/** Reads a stored record, returning null for anything that doesn't validate. */
export function fromRecord(raw: unknown): Profile | null {
  const data = (raw as { data?: unknown } | null)?.data;
  const parsed = ProfileSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

async function firestore() {
  const fb = await getFirebase();
  if (!fb) throw new Error("Firebase isn't configured");
  return { db: fb.db, fs: await import("firebase/firestore") };
}

export async function pushProfile(uid: string, profile: Profile): Promise<void> {
  const { db, fs } = await firestore();
  await fs.setDoc(fs.doc(db, "households", uid), toRecord(uid, profile));
}

export async function pullProfile(uid: string): Promise<Profile | null> {
  const { db, fs } = await firestore();
  const snap = await fs.getDoc(fs.doc(db, "households", uid));
  return snap.exists() ? fromRecord(snap.data()) : null;
}

let stop: (() => void) | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * On sign-in, adopts the cloud household if this device has none; otherwise keeps this device's
 * household. Then pushes every later change, a moment after the person stops editing.
 */
export async function startSync(user: Pick<User, "uid">): Promise<void> {
  stopSync();
  const remote = await pullProfile(user.uid);
  if (remote && !hasSavedProfile()) saveProfile(remote);
  else await pushProfile(user.uid, loadProfile());
  stop = onProfileSaved((profile) => {
    clearTimeout(timer);
    timer = setTimeout(() => void pushProfile(user.uid, profile).catch(() => {}), 800);
  });
}

export function stopSync(): void {
  clearTimeout(timer);
  stop?.();
  stop = undefined;
}
