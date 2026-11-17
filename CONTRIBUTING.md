# Contributing

## Setup

```bash
npm install
cp .env.example .env.local     # or: node scripts/load-keys.mjs
npm run dev
```

## Before you push

```bash
npm run format:check && npm run lint && npm run typecheck && npm run coverage
npm run test:e2e               # builds the app and runs the browser suites
npm run test:rules             # needs Java for the Firestore emulator
```

## Principles

- **Code decides, AI explains.** Any number a user sees comes from `src/core/`, never from a model.
- **`src/core/` stays pure:** no React, no Next, no network, no AI.
- **Strict types:** no `any`, no `@ts-ignore`. A hygiene test enforces this.
- **No console output in production code, no inline styles.** Both are tested.
- **Every new advice entry needs English and Hindi text**, and every new UI string needs both dictionaries.
- **Show your assumptions.** A new constant in the exposure model gets a line in `docs/MODEL.md`.
- **Keep one branch** (`main`) and small, focused commits.
