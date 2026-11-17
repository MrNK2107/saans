# The model, its assumptions and its sources

Saans turns "how polluted is the air" into "how much smog will _you_ breathe today, and what changes
that". The first half is a published index. The second half is a small, transparent physical model.
This page lists every constant so a reader can judge it, and so nothing is hidden behind the AI.

Everything here lives in [`src/core/`](../src/core). It is pure TypeScript with no framework or AI
dependency, and is covered by tests.

## 1. Air quality index (CPCB)

[`aqi.ts`](../src/core/aqi.ts) implements India's National AQI.

- Each pollutant gets a sub-index by linear interpolation inside its CPCB breakpoint band. The overall
  AQI is the **worst** sub-index.
- PM2.5 bands (µg/m³): 0-30, 31-60, 61-90, 91-120, 121-250, 251+. PM10 bands: 0-50, 51-100, 101-250,
  251-350, 351-430, 431+.
- Categories: Good (0-50), Satisfactory (51-100), Moderate (101-200), Poor (201-300), Very poor
  (301-400), Severe (401-500).
- **Assumption:** the top band is capped at 380 µg/m³ PM2.5 and 510 µg/m³ PM10 so the index tops out at 500. CPCB leaves the top band open.
- **Assumption:** the model supplies hourly values, so the "AQI" for a day is computed from the day's
  mean PM2.5 and PM10 rather than CPCB's 24-hour station average.

### GRAP stage

[`grap.ts`](../src/core/grap.ts) maps AQI to Delhi-NCR's Graded Response Action Plan bands
(I: 201-300, II: 301-400, III: 401-450, IV: above 450). The real trigger is the Commission for Air
Quality Management's _forecast_ for the city, so Saans labels this as a "range", never as a
declaration.

## 2. Where the air data comes from

[`server/air.ts`](../src/server/air.ts) reads hourly PM2.5 and PM10 from the
[Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) (no key, CC BY 4.0), which
is built on the Copernicus Atmosphere Monitoring Service (CAMS).

- It is a **model on an 11 km grid**, not a street sensor. Readings can differ from a nearby monitor.
- If the service is unreachable or returns something unexpected, the app uses a clearly labelled
  **typical winter day** ([`sample.ts`](../src/core/sample.ts)) and says so on screen.
- Missing single hours are filled from their neighbours; a fully empty series is treated as a failure.
- `AIR_SOURCE=sample` forces the typical day, for offline demos and deterministic tests.

## 3. Indoor air and personal exposure

[`exposure.ts`](../src/core/exposure.ts) estimates the PM2.5 a person inhales over a weekday.

**Indoors** it is a one-zone mass balance, the standard first-order model in indoor air research. For
each hour, with outdoor concentration `C_out`:

```
λ      = ACH + k + CADR / V
C_ss   = (P · ACH · C_out + S / V) / λ
C(t+1) = C_ss + (C(t) − C_ss) · e^(−λ)
```

It is solved exactly per hour and run over two days so the answer does not depend on the starting value.

| Symbol | Meaning                                        | Value used                                                                               |
| ------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `V`    | Air volume of the shared rooms                 | 35 / 55 / 80 m³ (small / medium / large)                                                 |
| `ACH`  | Air changes per hour from outside              | 0.8 windows shut, 4 windows open                                                         |
| `P`    | Share of outdoor PM2.5 that gets through walls | 0.8                                                                                      |
| `k`    | Particle settling rate                         | 0.25 per hour                                                                            |
| `CADR` | Purifier clean-air delivery rate               | 0 / 120 / 300 m³/h (none / budget / good HEPA)                                           |
| `S`    | Cooking emission into the shared rooms         | LPG 10 mg/h, PNG 8, induction 1, biomass 80; ×0.6 reaches the rooms; a hood removes half |

**Away from home** a person gets 0.6 of the outdoor level (an office or school with ordinary
infiltration).

**Travelling** applies a factor against the roadside level: car 0.6, metro 0.5, bus 0.8, and 1.0 for
open modes (two-wheeler, auto, e-rickshaw, walking, cycling).

**Dose** is concentration × how much air is breathed: 0.6 m³/h at home, 0.7 away, 0.8 travelling,
1.6 walking, and 2.5 for cycling or hard exercise. This is why cycling in a severe spell raises dose
and the planner will not recommend it then.

**Masks:** a fitted N95 lets 0.25 of particles through, a cloth mask 0.7. Both are indicative: real
filtration depends heavily on fit.

**Assumptions to be aware of**

- The numbers are for planning and comparison, **not measurements**. The _ordering_ of actions (a
  purifier beats a hood beats nothing) is robust; the exact percentages depend on the constants above.
- A typical weekday: sleep and morning at home, travel to 08:00, away until 17:00, travel back. Outdoor
  exercise defaults to the 06:00 hour, which is usually among the dirtiest.
- Windows follow a common habit (open 07-10 and 16-18) unless the plan says otherwise.
- Cooking is at 07-09 and 19-21.
- In a leaky home with ventilation at the assumed rate, airing the house at habitual hours changes the
  daily dose by under a percent; the planner reports a windows action only when it matters.

## 4. Impact numbers

Every "impact" shown to the user is computed, never written by the model.

- **PM2.5 breathed:** the percentage fall in the day's inhaled dose when one action is applied to the
  person's current habits. The headline figure applies every recommended action together.
- **CO2:** [`emissions.ts`](../src/core/emissions.ts) uses indicative grams per passenger-km at typical
  Delhi occupancy: car 140, auto 70, two-wheeler 45, bus 35, metro 20, e-rickshaw 20, walking and
  cycling 0. Published Indian studies (ITF-OECD, TERI, India GHG Programme) give wide ranges; these
  mid-range values keep the **ordering** right. A month is 4.3 weeks of the stated routine.
- **Greener travel is never recommended at the cost of breathing more smog.** A candidate mode is
  dropped if it raises the traveller's dose by more than 5%.
- **Community figures:** a carpool in threes cuts each rider's share to a third, and the model assumes
  three in ten households join.

## 5. What the AI does, and does not do

| The code decides                            | The model writes                                       |
| ------------------------------------------- | ------------------------------------------------------ |
| AQI, category, GRAP range                   | A headline and a short summary of today's air          |
| Which actions apply and how much each helps | The order of up to five actions, and a reason for each |
| All exposure, percentage and CO2 figures    | Replies to questions, in the person's language         |
| Whether a proposed change is valid          | _Proposals_ for change, which the person approves      |

The model only ever sees the finished facts ([`prompts.ts`](../src/ai/prompts.ts)), and is told to use
no number that isn't in them. Its output is checked against a schema, and any action it names that is
not in the computed plan is discarded.

## 6. Health content

Saans gives general guidance only. It never diagnoses, prescribes or names medicines, and points to a
doctor for breathlessness, chest tightness or a cough that will not settle. Conditions entered by the
household only make the advice more careful.

## Sources

- CPCB, National Air Quality Index (breakpoints and categories).
- Commission for Air Quality Management, Graded Response Action Plan (stage bands).
- Open-Meteo Air Quality API, based on CAMS (Copernicus Atmosphere Monitoring Service).
- ITF-OECD, _Life cycle assessment of passenger transport in India_; TERI, _Per passenger emission in
  Delhi, different modes_; India GHG Programme, _Road transport technical paper_.
- Indoor air mass-balance and purifier performance: standard indoor air quality literature (e.g. the
  UC Davis Corsi-Rosenthal box studies; EPA guidance on portable air cleaners).
- Delhi source apportionment: CAQM and IIT Kanpur studies cited in public reporting, which put
  vehicles at roughly half of local PM2.5 and biomass burning at roughly a fifth in winter.
