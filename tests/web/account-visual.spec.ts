import { expect, test } from "@playwright/test";

const scenarios = ["zero", "one", "multiple", "loading", "error", "timeout", "session"] as const;

async function openAccount(page: import("@playwright/test").Page, scenario: typeof scenarios[number], viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(`account?account=${scenario}`);
  await expect(page.getByRole("heading", { name: "Tài khoản" })).toBeVisible();
  if (scenario !== "loading") await page.waitForTimeout(300);
}

test("the Home account action opens UC-04 instead of a placeholder", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("?home=single");
  await page.getByRole("button", { name: "Tài khoản: UC-04 — Tài khoản/Cá nhân" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("tab", { name: "Cá nhân" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Chữ ký" })).toBeVisible();
});

for (const scenario of scenarios) {
  test(`captures ${scenario} account state at mobile and web viewports`, async ({ page }) => {
    await openAccount(page, scenario, { width: 375, height: 812 });
    await expect(page.getByText("Nguyễn Văn A")).toHaveCount(["zero", "one", "multiple"].includes(scenario) ? 1 : 0);
    await page.screenshot({ path: `evidence/uc04-account/${scenario}-375x812.png`, fullPage: true });
    await openAccount(page, scenario, { width: 1280, height: 900 });
    await page.screenshot({ path: `evidence/uc04-account/${scenario}-1280x900.png`, fullPage: true });
  });
}
