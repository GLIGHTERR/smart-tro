import { expect, test } from "@playwright/test";

const scenarios = ["zero", "one", "multiple", "loading", "error", "timeout", "session", "long"] as const;

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
  await page.getByRole("button", { name: "Quay lại" }).click();
  await expect(page).toHaveURL(/\/smart-tro\/\?home=single$/);
});

test("the Account back control falls back to Home for direct entry", async ({ page }) => {
  await openAccount(page, "one", { width: 375, height: 812 });
  await page.getByRole("button", { name: "Quay lại" }).click();
  await expect(page).toHaveURL(/\/smart-tro\/$/);
  await expect(page.getByText("Xin chào")).toBeVisible();
});

test("Personal and Signature tabs switch without a Home action", async ({ page }) => {
  await openAccount(page, "one", { width: 375, height: 812 });
  await page.getByRole("tab", { name: "Chữ ký" }).click();
  await expect(page.getByText("UC-32/UC-33 — Xem chữ ký điện tử.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Quay lại trang chủ" })).toHaveCount(0);
  await page.screenshot({ path: "evidence/uc04-account/signature-375x812.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: "evidence/uc04-account/signature-1280x900.png", fullPage: true });
  await page.getByRole("tab", { name: "Cá nhân" }).click();
  await expect(page.getByText("Nguyễn Văn A")).toBeVisible();
});

test("logout confirmation can cancel before confirming the existing flow", async ({ page }) => {
  await openAccount(page, "one", { width: 375, height: 812 });
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page.getByText("Đăng xuất?")).toBeVisible();
  await page.screenshot({ path: "evidence/uc04-account/logout-confirm-375x812.png", fullPage: true });
  await page.getByRole("button", { name: "Hủy" }).click();
  await expect(page.getByText("Đăng xuất?")).toHaveCount(0);
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).last().click();
});

for (const scenario of scenarios) {
  test(`captures ${scenario} account state at mobile and web viewports`, async ({ page }) => {
    await openAccount(page, scenario, { width: 375, height: 812 });
    await expect(page.getByText("Nguyễn Văn A")).toHaveCount(["zero", "one", "multiple", "long"].includes(scenario) ? 1 : 0);
    await page.screenshot({ path: `evidence/uc04-account/${scenario}-375x812.png`, fullPage: true });
    await openAccount(page, scenario, { width: 1280, height: 900 });
    await page.screenshot({ path: `evidence/uc04-account/${scenario}-1280x900.png`, fullPage: true });
  });
}
