# Architecture

Saans is a Next.js 16 (App Router) app with a strict separation between **computing** and **explaining**.

```mermaid
flowchart LR
  subgraph Browser
    UI[Home · Plan page · Assistant]
    LS[(localStorage, zod-validated)]
    UI <--> LS
  end
  subgraph Server[Next.js on Vercel]
    PX[proxy.ts · nonce CSP]
    API[/api/plan · narrate · chat · health/<br/>guard · throttle · memo]
    AIR[server/air.ts<br/>Open-Meteo or sample day]
    CORE[core/ · pure logic<br/>aqi · exposure · actions · plan]
    AI[AiProvider<br/>Gemini | Ollama | mock]
  end
  OM[(Open-Meteo / CAMS)]
  GEM[(Gemini)]
  FB[(Firebase Auth + Firestore)]
  UI --> PX --> API
  API --> AIR --> OM
  API --> CORE
  API --> AI --> GEM
  UI -. optional sign-in .-> FB
```

## Layers

| Layer  | Directory                     | Responsibility                                                                                              | Depends on            |
| ------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------- |
| Core   | `src/core/`                   | CPCB AQI, GRAP bands, indoor and personal exposure model, action planner, CO2, advice text, allowed changes | zod only              |
| AI     | `src/ai/`                     | The `AiProvider` contract, shared assistant logic, prompts, tool schemas, Gemini and Ollama engines, a mock | core, `@google/genai` |
| Server | `src/server/`, `src/app/api/` | Request guard, rate limit, cache, CSP builder, air data client, route handlers                              | core, ai              |
| Store  | `src/store/`                  | Validated local persistence, lazy Firebase, optional cloud sync                                             | core, `firebase`      |
| i18n   | `src/i18n/`                   | Typed English and Hindi dictionaries (a test checks identical keys and placeholders)                        | none                  |
| UI     | `src/ui/`, `src/app/`         | Accessible React components and routes                                                                      | all of the above      |

`src/core/` imports nothing from React, Next or the AI layer, so the whole decision engine runs and is
tested without a browser or a model.

## One request, end to end

1. The person edits the household form. The profile is validated and saved locally (and pushed to
   Firestore after a short pause if they are signed in).
2. `POST /api/plan` validates the profile, fetches today's hourly air for the neighbourhood (cached 15
   minutes, falling back to a labelled sample day) and calls `buildPlan`. The response is computed
   entirely by tested code and returns in well under a second.
3. In parallel the browser calls `POST /api/narrate`. The server rebuilds the same plan, hands the
   _finished facts_ to the model, and returns a headline, a summary and an ordering with reasons. This is
   cached for 20 minutes. If no model is configured the answer is empty and the plan stands alone.
4. In the chat, `POST /api/chat` returns a reply and zero or more proposed changes. Each proposal is
   checked against the real profile and shown in plain words. The browser applies it only after approval,
   which changes the profile and so recomputes the plan.

## Design decisions

- **Plan first, words second.** The plan never waits for a model, so a slow or absent model cannot break
  the page. This was measured: with a local 7-billion-parameter model the narrative took about 30 s while
  the plan arrived instantly.
- **The server recomputes.** The browser sends a profile, never a plan, so there is nothing to tamper with.
- **One provider contract.** Gemini, Ollama and a mock all implement a three-method `Engine`; everything
  else is shared. Gemini accepts several keys and rotates on a quota error, then falls through a model chain.
- **Local first.** The profile lives in `localStorage` and works without sign-in. Firebase loads lazily with
  dynamic `import()` only when the sign-in button is used.
- **No inline styles.** Charts are SVG with attribute-driven geometry, so the strict nonce CSP needs no
  style exemption.
