import { expect, test } from "@playwright/test";

test.skip(process.env.AUTH_SIGNUP_FLOW_REVIEW !== "true", "Signup flow coverage uses the dedicated mock-auth export.");

test("completes the mock signup fixture without creating a session", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("");
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await page.getByLabel("Email").fill("auth-review@example.com");
  await page.getByRole("button", { name: "Gửi OTP", exact: true }).click();
  await page.getByLabel("Mã OTP").fill("123456");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();

  await page.getByLabel("Họ và tên (bắt buộc)").fill("Auth Review");
  await page.getByLabel("Số điện thoại (không bắt buộc)").fill("0901234567");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Strong!1");
  await page.getByLabel("Nhập lại mật khẩu").fill("Strong!1");
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();

  await expect(page.getByText("Đăng ký thành công. Hãy đăng nhập để tiếp tục.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeVisible();
  await expect(page.getByText("Trang chủ")).toHaveCount(0);
});
