# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\app.spec.js >> User can generate movie insights
- Location: tests\app.spec.js:3:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Page snapshot

```yaml
- status "Loading Grafana" [ref=e5]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("User can generate movie insights", async ({ page }) => {
> 4  |   await page.goto("http://localhost:3000");
     |              ^ Error: page.goto: Test timeout of 30000ms exceeded.
  5  | 
  6  |   await page.fill("input", "Project Hail Mary");
  7  |   await page.click("button");
  8  | 
  9  |   await page.waitForSelector("text=🎯 Plot Hook", { timeout: 10000 });
  10 | 
  11 |   
  12 |   await expect(page.getByRole("heading", { name: "🎯 Plot Hook" })).toBeVisible();
  13 |   await expect(page.getByRole("heading", { name: "🧠 Themes" })).toBeVisible();
  14 |   await expect(page.getByRole("heading", { name: "🎬 Trivia" })).toBeVisible();
  15 | });
```