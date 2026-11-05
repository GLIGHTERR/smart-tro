import { expect, test } from "@playwright/test";

test.skip(process.env.CHANGE_PASSWORD_REVIEW !== "true", "Change-password masking checks use the authenticated review export.");

const fields = [
  "Mật khẩu hiện tại",
  "Mật khẩu mới",
  "Xác nhận mật khẩu mới",
] as const;

test("masks every change-password input initially and reveals only the selected input", async ({ page }) => {
  await page.goto("change-password");

  const inputs = fields.map((label) => page.getByLabel(label, { exact: true }));
  for (const input of inputs) await expect(input).toHaveAttribute("type", "password");

  for (const [index, label] of fields.entries()) {
    const field = page.getByTestId(`form-password-field-${label}`);
    await field.getByRole("button", { name: "Hiện mật khẩu", exact: true }).click();
    for (const [inputIndex, input] of inputs.entries()) await expect(input).toHaveAttribute("type", inputIndex === index ? "text" : "password");
    await field.getByRole("button", { name: "Ẩn mật khẩu", exact: true }).click();
    for (const input of inputs) await expect(input).toHaveAttribute("type", "password");
  }

  await page.reload();
  for (const label of fields) await expect(page.getByLabel(label, { exact: true })).toHaveAttribute("type", "password");
});

test("keeps the authenticated review session and returns to Account after a successful change", async ({ page }) => {
  await page.goto("change-password");

  await page.getByLabel("Mật khẩu hiện tại", { exact: true }).fill("Aa1!current");
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill("Bb2@changed");
  await page.getByLabel("Xác nhận mật khẩu mới", { exact: true }).fill("Bb2@changed");
  await page.getByRole("button", { name: "Đổi mật khẩu", exact: true }).click();

  await expect(page).toHaveURL(/account$/);
  await expect(page.getByRole("heading", { name: "Tài khoản", exact: true })).toBeVisible();
  await expect(page.getByText("Đổi mật khẩu thành công.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toHaveCount(0);
});
