import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { toRecord } from "@/store/cloud";
import { DEFAULT_PROFILE } from "@/core/types";

let env: RulesTestEnvironment;
const record = toRecord("alice", DEFAULT_PROFILE);
const as = (uid: string) => env.authenticatedContext(uid).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-saans",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "households/alice"), record);
  });
});

describe("households rules", () => {
  it("lets the owner read, write and delete their own household", async () => {
    const db = as("alice");
    await assertSucceeds(getDoc(doc(db, "households/alice")));
    await assertSucceeds(setDoc(doc(db, "households/alice"), toRecord("alice", DEFAULT_PROFILE)));
    await assertSucceeds(deleteDoc(doc(db, "households/alice")));
  });

  it("keeps everyone else out", async () => {
    await assertFails(getDoc(doc(as("bob"), "households/alice")));
    await assertFails(
      setDoc(doc(as("bob"), "households/alice"), toRecord("alice", DEFAULT_PROFILE)),
    );
    await assertFails(deleteDoc(doc(as("bob"), "households/alice")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "households/alice")));
  });

  it("rejects a document that claims another owner or has the wrong shape", async () => {
    const db = as("alice");
    await assertFails(setDoc(doc(db, "households/alice"), toRecord("bob", DEFAULT_PROFILE)));
    await assertFails(setDoc(doc(db, "households/alice"), { ...record, extra: true }));
    await assertFails(
      setDoc(doc(db, "households/alice"), {
        ...record,
        data: { ...record.data, audience: "robot" },
      }),
    );
    await assertFails(
      setDoc(doc(db, "households/alice"), {
        ...record,
        data: { ...record.data, households: 99999 },
      }),
    );
  });

  it("keeps every other collection closed", async () => {
    await assertFails(setDoc(doc(as("alice"), "anything/else"), { a: 1 }));
    await assertFails(getDoc(doc(as("alice"), "anything/else")));
  });
});
