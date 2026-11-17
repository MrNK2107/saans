import type { Key } from "@/i18n";

/**
 * Turns a Firebase Auth error code into a message the person can act on. Codes that mean "the person
 * simply changed their mind" map to null: there is nothing to report.
 */
export function authErrorKey(code: string): Key | null {
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return null;
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "auth.err.invalid";
    case "auth/email-already-in-use":
      return "auth.err.exists";
    case "auth/weak-password":
      return "auth.err.weak";
    case "auth/invalid-email":
    case "auth/missing-email":
      return "auth.err.email";
    case "auth/popup-blocked":
      return "auth.err.popup";
    case "auth/unauthorized-domain":
      return "auth.err.domain";
    case "auth/network-request-failed":
      return "auth.err.network";
    case "auth/too-many-requests":
      return "auth.err.many";
    case "auth/operation-not-allowed":
    case "auth/admin-restricted-operation":
      return "auth.err.disabled";
    default:
      return "auth.error";
  }
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD = 8;
