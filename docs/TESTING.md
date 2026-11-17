# Testing

| Suite                        | Command                                     | What it covers                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit, component, API         | `npm run coverage`                          | The decision engine, AI engines with fakes, prompts and tools, every API route (success, fallback, cache, 400/413/415/429/503), UI components, dictionaries, repository hygiene |
| Firestore rules (emulator)   | `npm run test:rules`                        | Owner access, strangers, malformed documents, a forged owner, closed collections                                                                                                |
| End-to-end and accessibility | `npm run test:e2e`                          | Real browser on desktop and Pixel 7: the full flows, axe WCAG 2.2 AA audits, CSP and headers, no sideways scrolling                                                             |
| Static checks                | `npm run lint`, `typecheck`, `format:check` | ESLint with zero warnings allowed, strict TypeScript, Prettier                                                                                                                  |

All of these run in [CI](../.github/workflows/ci.yml) on every push.

## What the tests protect

- **The model is right where it must be.** `core.test.ts` checks CPCB band edges, monotonic AQI, that a
  purifier beats a budget purifier beats nothing, that an N95 lowers a commuter's dose, that **cycling in
  smog raises it**, that opening windows in a very polluted hour raises indoor PM2.5, and that biomass
  cooking is worse than induction.
- **The planner makes sound decisions.** A severe day yields mask, purifier and sensitive-member advice; a
  greener commute is never recommended if it means breathing more smog; a clean day is quiet; community
  actions appear only for committees; someone working from home gets no commute advice.
- **The AI is contained.** Invalid or unknown tool calls are dropped; at most four are kept; actions the
  model invents are removed from its ordering; a malformed answer becomes a clear, safe error; prompt data
  cannot close its fence.
- **Everything degrades.** No AI configured, AI unreachable, air data down, storage blocked: each has a test.
- **Repository hygiene** ([`hygiene.test.ts`](../src/quality/hygiene.test.ts)) fails on `any`,
  `@ts-ignore`, console output, `eval`, inline styles, `dangerouslySetInnerHTML`, a key read outside the
  server, a key-shaped string anywhere in the tree, a missing required document, or an oversized source tree.
- **Language parity.** English and Hindi dictionaries must have identical keys and placeholders, and every
  advice entry must exist in both languages.

## Determinism

Unit and e2e runs never need a network or a model. `AI_PROVIDER=mock` swaps in a deterministic provider and
`AIR_SOURCE=sample` forces the built-in typical winter day. Playwright builds the production bundle first, so
the strict CSP is the one under test.

## Optional live checks

Run against a real local model:

```bash
AI_PROVIDER=ollama OLLAMA_MODEL=gemma4:latest npm run dev
```

and open `/plan`. The plan appears at once; the summary follows when the model answers.
