import { expect, test } from "@playwright/test";

test("runs the demo prompt workflow and opens a shared prompt", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "PromptDeck AI" })).toBeVisible();
  await expect(page.getByText("Turn Notes Into a Product Brief").first()).toBeVisible();

  await expect(page.getByRole("button", { name: "Use demo" })).toBeEnabled();
  await page.getByRole("button", { name: "Use demo" }).click();
  await expect(page.getByText("Demo session")).toBeVisible();

  await page.getByRole("button", { name: "Test prompt" }).click();

  await page.waitForFunction(() =>
    document.body.textContent?.includes("Demo response:"),
  );

  await page.goto("/share/product-brief");

  await expect(
    page.getByRole("heading", { name: "Turn Notes Into a Product Brief" }),
  ).toBeVisible();
  await expect(page.getByText("Raw notes:")).toBeVisible();
});
