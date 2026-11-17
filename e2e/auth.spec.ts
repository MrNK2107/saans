import { expect, test } from "@playwright/test";
import { expectAccessible } from "./helpers";

test.use({ reducedMotion: "reduce" });

const openDialog = async (page: import("@playwright/test").Page) => {
  await page.goto("/plan");
  await page.getByRole("button", { name: "Sign in" }).click();
  const dialog = page.getByRole("dialog", { name: "Sign in to keep your household" });
  await expect(dialog).toBeVisible();
  return dialog;
};

test("the sign-in dialog offers Google and email, with the Google logo", async ({ page }) => {
  const dialog = await openDialog(page);
  const google = dialog.getByRole("button", { name: "Continue with Google" });
  await expect(google).toBeVisible();
  await expect(google.locator("svg.google-logo")).toBeVisible();
  await expect(dialog.getByLabel("Email")).toBeVisible();
  await expect(dialog.getByLabel("Password")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Forgot password?" })).toBeVisible();
});

test("the sign-in dialog is accessible in English and in Hindi", async ({ page }) => {
  await openDialog(page);
  await expectAccessible(page);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /switch language to hindi/i }).click();
  await page.getByRole("button", { name: "साइन-इन" }).click();
  await expect(page.getByRole("dialog")).toContainText("Google से जारी रखें");
  await expectAccessible(page);
});

test("Escape closes the dialog and returns focus to the Sign in button", async ({ page }) => {
  await openDialog(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeFocused();
});

test("mistakes are explained on screen, not only to screen readers", async ({ page }) => {
  const dialog = await openDialog(page);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  const alert = dialog.getByRole("alert");
  await expect(alert).toHaveText("Enter a valid email address.");
  await expect(alert).toBeVisible();
  await expect(dialog.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  await expectAccessible(page);

  await dialog.getByLabel("Email").fill("asha@example.com");
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(alert).toHaveText("Enter your email and password.");

  await dialog.getByRole("button", { name: "New here? Create an account" }).click();
  await expect(dialog.getByText("At least 8 characters")).toBeVisible();
  await dialog.getByLabel("Password").fill("short");
  await dialog.getByRole("button", { name: "Create account" }).click();
  await expect(dialog.getByRole("alert")).toContainText("at least 8 characters");
});

test("a failed attempt shows a visible message and leaves the dialog open", async ({ page }) => {
  const dialog = await openDialog(page);
  await dialog.getByLabel("Email").fill("asha@example.com");
  await dialog.getByLabel("Password").fill("a-long-enough-password");
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  // Placeholder Firebase config: the service refuses, or can't be reached. Either way it must say so.
  await expect(dialog.getByRole("alert")).toBeVisible({ timeout: 20_000 });
  await expect(dialog.getByRole("alert")).not.toBeEmpty();
  await expect(dialog).toBeVisible();
});

test("the dialog fits a phone without sideways scrolling", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile layout only");
  const dialog = await openDialog(page);
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box && viewport && box.x >= 0 && box.x + box.width <= viewport.width).toBe(true);
});
