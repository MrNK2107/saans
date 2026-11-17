import { expect, test } from "@playwright/test";
import { expectAccessible, openPlan } from "./helpers";

test.use({ reducedMotion: "reduce" });

test("landing page is accessible in English and Hindi", async ({ page }) => {
  await page.goto("/");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Switch language to Hindi" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("स्मॉग");
  await expectAccessible(page);
});

test("plan page is accessible, with the table and the assistant open", async ({ page }) => {
  await openPlan(page);
  await expectAccessible(page);
  await page.getByText("Hourly values").click();
  await expectAccessible(page);
  await page.getByLabel("Your question").fill("Should I buy a purifier?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText(/Suggested change/)).toBeVisible();
  await expectAccessible(page);
});

test("plan page is accessible in Hindi and in community mode", async ({ page }) => {
  await openPlan(page);
  await page.getByLabel("A housing society or community").check();
  await page.getByRole("button", { name: "Update my plan" }).click();
  await expect(page.getByRole("heading", { name: "Agree a no-burning pledge" })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Switch language to Hindi" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expectAccessible(page);
});

test("form errors are announced and accessible", async ({ page }) => {
  await openPlan(page);
  for (const label of ["Children under 5", "Children 5 to 17", "Adults", "Adults 60 and over"]) {
    await page.getByLabel(label, { exact: true }).fill("0");
  }
  await expect(page.getByRole("alert").filter({ hasText: "Who is at home" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Update my plan" })).toBeDisabled();
  await expectAccessible(page);
});

test("keyboard users can reach the skip link first", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
});

test("no page scrolls sideways on a phone", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile layout only");
  for (const path of ["/", "/plan"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});
