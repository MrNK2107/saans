---
version: 1
slug: "src-app-plan-page-tsx"
primary_target: "src/app/plan/page.tsx"
related_targets: ["src/app/page.tsx"]
---

# Surface brief: Saans app (landing, quick setup, Today)

Mode: Operate (the landing's first screen is itself a working tool: live air for an area).
Audience and job: Delhi-NCR families and housing committees, mostly on phones, often in Hindi. They need to know what to do today and when, with the proof.
Settled structure (user confirmed): live air for the chosen area on the landing, then a 3-step quick setup (area, who is home, how you move), then one Today screen. Actions sit on an hour-by-hour timeline, impact is drawn on that same timeline, Ask Saans is a persistent panel that can explain any item. Household form moves into a drawer.
Visible gap to fix: today the pages are a form beside four equal cards with nothing linking air, meaning, action and proof.

## Direction contract

THESIS: The day is a panchang: eight named hour bands (Stay in, Careful, Best, Sleep) that a family reads like the wall almanac in their home, instead of a stack of equal cards.

OWN-WORLD: Almanac print. Warm paper ground (#f7ecd6), deep brown ink (#3a1d0d), vermilion accent (#b3411a) for the current band and primary actions, band fills in soft red, amber and green carrying real meaning. Teko for display numerals and band names, Mukta for text. A boxed hour grid with 2px ink rules is the signature. Cream and red-orange is the category default, so commit harder: saturated band fields, strong rules, no pastel mush.

STORY: A visitor sees today's real AQI for their area, sees the day cut into bands, understands which hours are dangerous for their household, does the next action, and sees the before and after proof on the same scale.

FIRST VIEWPORT: Phone 390x844. Top bar with logo, language, sign in. Date and area, then "Today: Very poor, 346". Below it the eight-band hour grid (2 rows by 4) at full width, the current band marked. Then a dark "Right now" strip with the next action, then two proof tiles (smog breathed, CO2). Bottom tab bar: Today, Air, Ask, Home.

FORM: Panchang Bands, my own top-ranked candidate (position 1, the roll assigned position 5, Route Board; user chose the pick). seed:d49035b8692a507e

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions
- Quick setup: three steps, skippable, defaults to the example household with the existing example label.
- Hindi labels stay primary where the language is Hindi; no permanent bilingual doubling.
- Keep all existing tests and axe audits passing; strict nonce CSP, no inline style attributes.
