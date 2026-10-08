import { expect, test } from "@playwright/test";

test.skip(process.env.AUTH_VISUAL_REVIEW !== "true", "Auth visual evidence uses the dedicated mock-auth export.");

test("captures the approved sign-in and OTP layouts", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("");
  await expect(page.getByRole("button", { name: "Đăng nhập với Facebook" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Đăng nhập với Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Đăng nhập với Apple" })).toBeVisible();
  await page.screenshot({ path: "evidence/auth-visual/sign-in-social-375x812.png", fullPage: true });

  await page.getByRole("button", { name: "Đăng ký" }).click();
  await page.getByLabel("Email").fill("mai@example.com");
  await page.getByRole("button", { name: "Gửi OTP" }).click();
  await expect(page.getByRole("button", { name: "Đổi email" })).toBeVisible();
  const labels = await page.getByRole("button").allTextContents();
  expect(labels.indexOf("Đổi email")).toBeLessThan(labels.indexOf("Tiếp tục"));
  expect(labels.indexOf("Tiếp tục")).toBeLessThan(labels.findIndex((label) => label.startsWith("Gửi lại mã OTP")));
  await page.screenshot({ path: "evidence/auth-visual/sign-up-otp-375x812.png", fullPage: true });
});
