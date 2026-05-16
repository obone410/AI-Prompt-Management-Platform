import { expect, test } from "@playwright/test";

test("runs the demo prompt workflow and opens a shared prompt", async ({ page }) => {
  const navButton = (name: string) =>
    page.getByRole("navigation").getByRole("button", { name });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "PromptDeck AI" })).toBeVisible();
  await expect(page.getByText("AI Execution OS v3.1.0")).toBeVisible();

  await expect(page.getByRole("button", { name: "Use demo" }).first()).toBeEnabled();
  await page.getByRole("button", { name: "Use demo" }).first().click();
  await expect(page.getByText("Demo session").first()).toBeVisible();

  await navButton("Operations").click();
  await expect(page.getByText("Turn Notes Into a Product Brief").first()).toBeVisible();
  await page.getByRole("button", { name: "Test prompt" }).click();

  await page.waitForFunction(() =>
    document.body.textContent?.includes("Demo response:"),
  );

  await navButton("Benchmarks").click();
  await expect(page.getByText("AI benchmarking suite")).toBeVisible();
  await page.getByRole("button", { name: "Run benchmark suite" }).click();
  await expect(page.getByText("Benchmark suite complete.")).toBeVisible();
  await page.getByRole("button", { name: "Run experiment" }).first().click();
  await expect(page.getByText("Experiment results")).toBeVisible();
  await expect(page.getByText("Cost").first()).toBeVisible();

  await navButton("Agents").click();
  await expect(page.getByText("Agent builder canvas")).toBeVisible();
  await page.getByRole("button", { name: "Run agent" }).click();
  await expect(page.getByText("Agent execution complete.")).toBeVisible();

  await navButton("Workflows").click();
  await expect(page.getByText("Workflow Engine v2")).toBeVisible();
  await page.getByRole("button", { name: "Run workflow" }).click();
  await expect(page.getByText("Workflow run complete.")).toBeVisible();

  await navButton("Releases").click();
  await expect(page.getByText("Release management lifecycle")).toBeVisible();
  await page.getByRole("button", { name: "Deploy selected prompt" }).click();
  await expect(page.getByText("Deployment Timeline")).toBeVisible();

  await navButton("Observability").click();
  await expect(page.getByText("LangSmith-style trace observability")).toBeVisible();

  await page.goto("/share/product-brief");

  await expect(
    page.getByRole("heading", { name: "Turn Notes Into a Product Brief" }),
  ).toBeVisible();
  await expect(page.getByText("Raw notes:")).toBeVisible();
});
