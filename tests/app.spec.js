import { test, expect } from "@playwright/test";

test("User can generate movie insights", async ({ page }) => {
  await page.goto("http://localhost:3000");

  await page.fill("input", "Project Hail Mary");
  await page.click("button");

  await page.waitForSelector("text=🎯 Plot Hook", { timeout: 10000 });

  
  await expect(page.getByRole("heading", { name: "🎯 Plot Hook" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "🧠 Themes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "🎬 Trivia" })).toBeVisible();
});