/** Canonical origin for metadata; set NEXT_PUBLIC_SITE_URL on the host, falls back to localhost. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
