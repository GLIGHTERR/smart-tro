import { expect, test } from "@playwright/test";

test.use({ hasTouch: true });

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

test("web history back preserves a dirty UC-05 form until the renter discards it", async ({ page }) => {
  await openAccount(page, "one", { width: 375, height: 812 });
  await page.getByRole("button", { name: "Chỉnh sửa thông tin cá nhân" }).click();
  await expect(page.getByRole("heading", { name: "Cập nhật thông tin cá nhân" })).toBeVisible();
  const name = page.getByRole("textbox", { name: "Họ và tên" });
  await name.fill("Mai An");
  await page.goBack();
  await expect(page.getByText("Hủy thay đổi?")).toBeVisible();
  await page.screenshot({ path: "evidence/uc05-edit-profile/web-back-dirty-dialog-375x812.png", fullPage: true });
  await page.goBack();
  await expect(page.getByText("Hủy thay đổi?")).toHaveCount(1);
  await page.getByRole("button", { name: "Tiếp tục chỉnh sửa" }).click();
  await expect(name).toHaveValue("Mai An");
  await expect(page.getByRole("heading", { name: "Cập nhật thông tin cá nhân" })).toBeVisible();
  await page.goBack();
  await page.getByRole("button", { name: "Bỏ thay đổi" }).click();
  await expect(page.getByRole("heading", { name: "Tài khoản" })).toBeVisible();
});

test("direct cancel discard leaves dirty UC-05 for Account without a profile PATCH", async ({ page }) => {
  await openAccount(page, "one", { width: 375, height: 812 });
  await page.getByRole("button", { name: "Chỉnh sửa thông tin cá nhân" }).click();
  await page.getByRole("textbox", { name: "Họ và tên" }).fill("Mai An");
  await page.getByRole("button", { name: "Hủy chỉnh sửa" }).click();
  await expect(page.getByText("Hủy thay đổi?")).toBeVisible();
  await page.getByRole("button", { name: "Bỏ thay đổi" }).click();
  await expect(page.getByRole("heading", { name: "Tài khoản" })).toBeVisible();
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

test("UC-04 tabs expose exactly one selected DOM state after pointer, touch, and keyboard activation", async ({ page }) => {
  await openAccount(page, "one", { width: 375, height: 812 });
  const personal = page.getByRole("tab", { name: "Cá nhân" });
  const signature = page.getByRole("tab", { name: "Chữ ký" });
  await expect(personal).toHaveAttribute("aria-selected", "true");
  await expect(signature).toHaveAttribute("aria-selected", "false");

  await signature.click();
  await expect(personal).toHaveAttribute("aria-selected", "false");
  await expect(signature).toHaveAttribute("aria-selected", "true");

  await personal.focus();
  await page.keyboard.press("Enter");
  await expect(personal).toHaveAttribute("aria-selected", "true");
  await expect(signature).toHaveAttribute("aria-selected", "false");

  await signature.tap();
  await expect(personal).toHaveAttribute("aria-selected", "false");
  await expect(signature).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("UC-32/UC-33 — Xem chữ ký điện tử.")).toBeVisible();
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
