import { expect, test } from "@playwright/test";
import { mockSignupApi } from "./auth-api-fixture";

test.skip(process.env.AUTH_SIGNUP_FLOW_REVIEW !== "true", "Signup flow coverage uses the dedicated mock-auth export.");

test("completes the mock signup fixture without creating a session", async ({ page }) => {
  const api = await mockSignupApi(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("");
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await page.getByLabel("Email").fill("auth-review@example.com");
  await page.getByRole("button", { name: "Gửi OTP", exact: true }).click();
  await page.getByLabel("Mã OTP", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();

  await page.getByLabel("Họ và tên (bắt buộc)").fill("Auth Review");
  await page.getByLabel("Số điện thoại (không bắt buộc)").fill("0901234567");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  const password = page.getByLabel("Mật khẩu", { exact: true });
  const confirmation = page.getByLabel("Nhập lại mật khẩu");
  const passwordField = page.getByTestId("auth-field-Mật khẩu");
  const confirmationField = page.getByTestId("auth-field-Nhập lại mật khẩu");
  // Both password fields use the public shell's outside ring for keyboard and pointer focus.
  for (const [input, field] of [[password, passwordField], [confirmation, confirmationField]] as const) {
    await input.focus();
    await expect(field).toHaveCSS("border-radius", "24px");
    await expect(field).toHaveCSS("border-top-width", "0px");
    await expect(field).toHaveCSS("box-shadow", "rgb(0, 0, 0) 0px 0px 0px 2px");
    await input.click();
    await expect(field).toHaveCSS("box-shadow", "rgb(0, 0, 0) 0px 0px 0px 2px");
  }
  await password.fill("Strong!1");
  await confirmation.fill("Strong!1");
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();

  await expect(page.getByText("Đăng ký thành công. Hãy đăng nhập để tiếp tục.")).toBeVisible();
  expect(api.completedProfiles).toEqual([{ phone: "+84901234567" }]);
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeVisible();
  await expect(page.getByText("Trang chủ")).toHaveCount(0);
});
