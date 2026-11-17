# Saans · साँस

### Breathe easier through Delhi's winter smog

A GenAI assistant that reads today's air in your neighbourhood and builds a day for **your** household: a
low-emission routine, indoor air hacks and greener travel, with the direct impact of every choice computed
and shown.

_Built for Prompt Wars, Challenge 6: a GenAI-powered assistant that helps families and communities navigate
severe winter smog and urban air pollution._

---

## Chosen vertical

**Families and housing communities in Delhi-NCR.** The challenge statement names no list of verticals, so
Saans designs around the two audiences it does name. A household picks "my family" or "a housing society or
community", and the advice changes scale: a family gets a mask, a purifier and a safer school run; a
committee also gets a shared clean-air room, a carpool roster and a no-burning pledge, with the
community-wide effect worked out.

## Approach and logic

Delhi's winter smog is a daily _decision_ problem, so Saans answers "what should we do today, and what will it
change?" rather than "what is the AQI?".

**Code decides, AI explains.** Every number a person sees comes from tested, deterministic code in
[`src/core/`](src/core). The model never produces one.

| Step | What happens                                                                                                                      | Who does it |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1    | Read today's hourly PM2.5 and PM10 for the neighbourhood and compute the official CPCB AQI, category and GRAP range               | code        |
| 2    | Model how much PM2.5 each person in the household inhales over a day: indoors (windows, purifier, cooking), commuting, exercising | code        |
| 3    | Evaluate each candidate action against today's habits and keep those that help, with the measured percentage                      | code        |
| 4    | Check the greener-travel options and drop any that would raise the traveller's smog dose                                          | code        |
| 5    | Write a headline, order the actions and explain why each fits _this_ household, in English or Hindi                               | Gemini      |
| 6    | Answer questions and _propose_ changes; the person approves, and the plan is recomputed                                           | Gemini      |

The decisions come from user context, not a template. Examples from the test suite:

- A **severe-smog** day recommends a fitted N95, a purifier and keeping sensitive members in at the dirtiest hours.
- A **clean day** is quiet: no mask, no alarm.
- **Cycling is never suggested in a severe spell**, because hard breathing raises how much smog reaches the
  lungs. A greener trip must not cost the traveller their health.
- Opening windows is advised **only** when the cleanest hour is clean enough to be worth it.
- Someone **working from home** gets no commute advice; a household with **biomass cooking** gets a fuel switch.
- The windows, exercise-time and travel-mode advice is **chosen by simulating the alternatives** and picking the best.

## How it works

1. **Tell it about your home** (area, who lives there, health conditions, commute, kitchen, purifier). It
   stays on your device unless you sign in with Google.
2. **`/api/plan`** fetches the hourly air model for your neighbourhood, builds the plan and returns it in well
   under a second. If live data is unreachable it uses a clearly labelled typical winter day.
3. **The page shows** the air now (an accessible chart with a table behind it), **what your choices change**
   (before and after for the person who travels and the person who stays home), and **do this today**, grouped
   as routine, indoor air, greener travel and, for committees, community actions. Each card carries its impact
   as a chip such as "about 59% less PM2.5 breathed in a day" or "51.6 kg less CO2 a month" (a 10 km car commute moved to the metro).
4. **`/api/narrate`** runs in parallel and brings in the model's headline, ordering and per-household reasons
   when it is ready. The plan never waits for it.
5. **Ask Saans** takes questions in plain language and proposes changes ("get a purifier", "go by metro").
   Each is shown in words, and nothing changes until you press **Apply and recompute**.

Everything is available in **English and Hindi**.

## Assumptions

The full model, every constant, and its sources are in **[docs/MODEL.md](docs/MODEL.md)**. The ones that matter
most:

- **Air data is a model, not a street monitor.** It comes from Open-Meteo (Copernicus CAMS) on an ~11 km grid,
  so it can differ from a nearby station. The app labels live and sample data.
- **Exposure figures are planning estimates**, from a standard one-zone indoor mass-balance model with stated
  constants (a leaky flat, 0.8 air changes an hour with windows shut). The _ordering_ of actions is robust; the
  exact percentages depend on those constants.
- **A typical weekday** is assumed: home until 08:00, away until 17:00, cooking at 07-09 and 19-21.
- **CO2 factors are mid-range planning values** from published Indian studies, kept to preserve the correct
  ordering of modes.
- **GRAP ranges are an explanation aid.** The real stage is declared from the Commission for Air Quality
  Management's forecast.
- **Not medical advice.** The app never diagnoses or names medicines, and points to a doctor for symptoms.

## Evaluation criteria, with proof

| Criterion             | Implementation and proof                                                                                                                                                                                                                                 | Docs                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Code quality**      | Next.js 16, strict TypeScript (`noUncheckedIndexedAccess`), zero `any`/`@ts-ignore`, ESLint with no warnings allowed, Prettier. A pure `core/` layer with no framework or AI imports; one `AiProvider` contract with Gemini, Ollama and mock behind it.  | [ARCHITECTURE](docs/ARCHITECTURE.md), [CONTRIBUTING](CONTRIBUTING.md) |
| **Security**          | Nonce CSP with `strict-dynamic`, zod validation and size caps on every route, per-client rate limits, server-only keys, fenced and escaped prompts, schema-checked model output, allow-listed and approval-gated tool calls, owner-only Firestore rules. | [SECURITY](SECURITY.md)                                               |
| **Efficiency**        | The plan is computed in code and returns without waiting for any model; air data is cached 15 min and narratives 20 min; Firebase loads lazily; charts are plain SVG; no animation or 3D libraries; a small dependency set.                              | [ARCHITECTURE](docs/ARCHITECTURE.md)                                  |
| **Testing**           | 132 unit, component and API tests (91% statement coverage), 4 Firestore-rules tests on the emulator, 33 end-to-end tests on desktop and Pixel 7 (flows, axe audits, CSP). Deterministic mock AI and sample air data; no network needed.                  | [TESTING](docs/TESTING.md)                                            |
| **Accessibility**     | WCAG 2.2 AA audited by axe in CI, in English and Hindi, on desktop and phone. Colour never the only signal, a text table behind the chart, `lang` on Hindi, 44px targets, skip link, reduced motion, dark mode, print styles.                            | [ACCESSIBILITY](docs/ACCESSIBILITY.md)                                |
| **Problem alignment** | Low-emission daily routines, indoor air hacks and sustainable alternatives, tailored to location and lifestyle, for families and communities, with the **direct impact of each choice** computed and shown.                                              | [PRODUCT](PRODUCT.md), [MODEL](docs/MODEL.md)                         |

## Run it

```bash
npm install
cp .env.example .env.local        # add GEMINI_API_KEYS, or point at a local Ollama model
npm run dev                       # http://localhost:3000
```

With no AI configured Saans still works: the plan is computed by code. With no Firebase config the sign-in
button is hidden and the household stays on the device.

```bash
npm run coverage      # unit, component and API tests
npm run test:rules    # Firestore rules on the emulator (needs Java)
npm run test:e2e      # builds the app, then browser tests with axe audits
```

To use several Gemini keys, put them comma-separated in `~/.secrets/gemini.keys` and run
`node scripts/load-keys.mjs`. It writes them to the git-ignored `.env.local` without printing them, and the
app rotates to the next key on a quota error.

## Deploy

Vercel, with no extra configuration. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Tech

Next.js 16 (App Router), React 19, TypeScript, zod 4, `@google/genai`, Firebase Auth and Firestore,
Open-Meteo, Vitest, Testing Library, Playwright, axe-core.

Air data: [Open-Meteo](https://open-meteo.com/) (CAMS), CC BY 4.0. Index: CPCB National AQI.
