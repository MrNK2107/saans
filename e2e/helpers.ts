import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** WCAG 2.2 AA audit of the current page; fails with the list of violations. */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`,
  );
  expect(summary).toEqual([]);
}

/** Opens the plan page with the default household and waits for the computed plan. */
export async function openPlan(page: Page) {
  await page.goto("/plan");
  await expect(page.getByRole("heading", { level: 2, name: /Air in/ })).toBeVisible({
    timeout: 20_000,
  });
}
