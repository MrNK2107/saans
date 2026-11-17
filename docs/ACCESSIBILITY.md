# Accessibility

Target: **WCAG 2.2 AA**, verified automatically and by hand.

## Automated

[`e2e/a11y.spec.ts`](../e2e/a11y.spec.ts) runs axe-core (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
`wcag22aa`) in CI on desktop Chrome and a Pixel 7 profile against:

- the landing page in English and in Hindi
- the plan page, with the hourly table open and with an assistant proposal showing
- the plan page in community mode and in Hindi
- the form's error state (an empty household)

It also checks the skip link is the first tab stop and that no page scrolls sideways on a phone.

One real defect was found and fixed by this suite: the language button's accessible name did not contain
its visible text (WCAG 2.5.3 Label in Name).

## Design decisions

- **Colour is never the only signal.** AQI categories are always written out. Chart bars add a dashed
  outline for the dirtiest hours and a solid one for the cleanest.
- **Charts have text equivalents.** The hourly chart is an `img` with a spoken summary, plus a real
  `<table>` behind a disclosure.
- **Forms:** every input has a visible label; groups use `fieldset` and `legend`; the empty-household
  error is announced with `role="alert"` and the submit button is disabled.
- **Live regions:** loading, the AI summary arriving, and assistant replies are announced politely.
- **Keyboard:** everything is reachable and operable by keyboard; a skip link leads to `main`; focus
  rings are 3px with a 2px offset.
- **Touch targets** are at least 44px.
- **Language:** `<html lang>` follows the chosen language, and the app content sets `lang` too, so screen
  readers pronounce Hindi correctly. Fonts cover Latin and Devanagari.
- **Motion:** only a 1px button press, and only when `prefers-reduced-motion` allows it.
- **Colour scheme:** a dark theme follows the system setting, with contrast kept at AA.
- **Print:** the form, assistant and header are hidden so a plan can be printed for an elder.

## Not covered by automation

Screen-reader pass with NVDA or VoiceOver, and a review of Hindi copy by a native speaker, are
recommended before wider release.
