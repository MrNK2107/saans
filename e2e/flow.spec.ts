import { expect, test } from "@playwright/test";
import { closeHousehold, openHousehold, openPlan } from "./helpers";

test("a family goes from the landing page to a plan with measured impact", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Build my plan" }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(
    page.getByRole("heading", { level: 2, name: "Air in Anand Vihar today" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "What your choices change" }),
  ).toBeVisible();
  await expect(page.getByText(/% less smog inhaled over the day/).first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Do this today" })).toBeVisible();
  await expect(page.getByText(/less PM2\.5 breathed in a day/).first()).toBeVisible();
});

test("changing the household recomputes the plan and is remembered", async ({ page }) => {
  await openPlan(page);
  await openHousehold(page);
  await page.getByLabel("Area").selectOption("dwarka");
  await page.getByLabel("Usual way of travelling").selectOption("metro");
  await page.getByRole("button", { name: "Update my plan" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Air in Dwarka today" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Air in Dwarka today" })).toBeVisible();
  await openHousehold(page);
  await expect(page.getByLabel("Usual way of travelling")).toHaveValue("metro");
});

test("the assistant proposes a change and nothing happens until it is approved", async ({
  page,
}) => {
  await openPlan(page);
  await openHousehold(page);
  await expect(page.getByLabel("Air purifier")).toHaveValue("none");
  await closeHousehold(page);
  await page.getByLabel("Your question").fill("Should I buy a purifier?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText(/Suggested change/)).toBeVisible();
  await openHousehold(page);
  await expect(page.getByLabel("Air purifier")).toHaveValue("none");
  await closeHousehold(page);
  await page.getByRole("button", { name: "Apply and recompute" }).click();
  await openHousehold(page);
  await expect(page.getByLabel("Air purifier")).toHaveValue("good");
});

test("the interface switches to Hindi and sets the page language", async ({ page }) => {
  await openPlan(page);
  await page.getByRole("button", { name: "Switch language to Hindi" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /आज .* की हवा/ })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
});

test("a community committee sees community actions", async ({ page }) => {
  await openPlan(page);
  await openHousehold(page);
  await page.getByLabel("A housing society or community").check();
  await page.getByLabel("Usual way of travelling").selectOption("car");
  await page.getByLabel("Households in the community").fill("120");
  await page.getByRole("button", { name: "Update my plan" }).click();
  await expect(page.getByRole("heading", { name: "Start a carpool roster" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Agree a no-burning pledge" })).toBeVisible();
});

test("the hourly values are available as a table", async ({ page }) => {
  await openPlan(page);
  await page.getByText("Hourly values").click();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(25);
});
