# Security

## Reporting a vulnerability

Please open a private security advisory on this repository rather than a public issue.

## Threat model

| Threat                                 | Control                                                                                                                                                                                                                                                                       | Where                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Leaked AI credentials                  | Gemini keys are read only by server code (`src/ai`, `src/app/api`, `src/server`), never by a client component, and a hygiene test enforces it. `.env*` files are git-ignored and a test fails on any key-shaped string in the tree.                                           | [`provider.ts`](src/ai/provider.ts), [`hygiene.test.ts`](src/quality/hygiene.test.ts)        |
| Cross-site scripting                   | Per-request nonce CSP with `strict-dynamic`; no `unsafe-inline` or `unsafe-eval` in production; React escapes text; no inline `style` attributes and no `dangerouslySetInnerHTML` (both checked by a test).                                                                   | [`proxy.ts`](src/proxy.ts), [`csp.ts`](src/server/csp.ts)                                    |
| Clickjacking, MIME sniffing, downgrade | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, HSTS with preload, `upgrade-insecure-requests`, strict `Referrer-Policy`, and a `Permissions-Policy` that turns off camera, microphone, geolocation and payment.                                                | [`next.config.ts`](next.config.ts)                                                           |
| Malformed or oversized requests        | Every API route requires `application/json`, caps the body at 64 KB, and validates with zod before any work. Errors name the field and never reveal internals.                                                                                                                | [`guard.ts`](src/server/guard.ts), [`schemas.ts`](src/server/schemas.ts)                     |
| Abuse and quota exhaustion             | Per-client fixed-window limits on every route (tightest on the model routes), a 20-minute cache for identical narrative requests, a 15-minute cache for air data, and a hard time budget per model call.                                                                      | [`throttle.ts`](src/server/throttle.ts), [`memo.ts`](src/server/memo.ts)                     |
| Spoofed client address                 | The limiter keys on the **last** `X-Forwarded-For` entry, the one the host's proxy appends; anything a client puts earlier is ignored.                                                                                                                                        | [`throttle.ts`](src/server/throttle.ts)                                                      |
| Prompt injection                       | Household data goes to the model only inside tagged blocks with `<` escaped, so it cannot close the block. The model sees finished facts, never free text from other users. Output must match a schema, and any action it names that isn't in the computed plan is discarded. | [`prompts.ts`](src/ai/prompts.ts), [`assistant.ts`](src/ai/assistant.ts)                     |
| A model changing things it shouldn't   | The assistant can only propose six allow-listed changes. Each is re-validated against the real profile, described in plain words, and applied **only after the person approves**.                                                                                             | [`tools.ts`](src/ai/tools.ts), [`changes.ts`](src/core/changes.ts)                           |
| Untrusted client data                  | The server rebuilds the plan itself from the validated profile. It never trusts a plan sent by the browser.                                                                                                                                                                   | [`/api/plan`](src/app/api/plan/route.ts), [`/api/narrate`](src/app/api/narrate/route.ts)     |
| Reading or editing someone's household | Firestore rules: only the signed-in owner can read or write `households/{uid}`, the document shape and sizes are checked, and every other collection is closed. Tested on the emulator.                                                                                       | [`firestore.rules`](firestore.rules), [`rules/households.test.ts`](rules/households.test.ts) |
| Tampered local storage                 | The saved household is validated with zod on every load; anything invalid is ignored.                                                                                                                                                                                         | [`local.ts`](src/store/local.ts)                                                             |
| Unsafe upstream data                   | Open-Meteo responses are parsed with a schema, range-checked, and discarded if odd; the app then falls back to a labelled sample day.                                                                                                                                         | [`air.ts`](src/server/air.ts)                                                                |
| Vulnerable dependencies                | CI runs `npm audit --omit=dev --audit-level=high`, and a patched `@grpc/grpc-js` is pinned through `overrides`.                                                                                                                                                               | [`ci.yml`](.github/workflows/ci.yml), [`package.json`](package.json)                         |

## Privacy

- The household profile stays on the device unless the person signs in with Google, which is optional.
- If they do, the profile is stored in Firestore under their own user id and nowhere else.
- The server logs nothing about a household. Only a neighbourhood centre point (never an address) is sent
  to the air data service.
- Health conditions are optional, used only to make advice more careful, and never sent to anyone but
  the model provider as part of the finished facts.

## Notes

- The Firebase web config (`NEXT_PUBLIC_FIREBASE_*`) is public by design; access is enforced by the rules.
- Rate limits are kept in memory per server instance, enough to blunt accidental loops and casual abuse.
  A shared store such as Redis would make them global if abuse ever required it.
- `RATE_LIMIT_SCALE` raises the limits for the end-to-end suite, which runs from a single address.
