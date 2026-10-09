import { expect, test } from "@playwright/test";

test.skip(process.env.AUTH_CHANGE_EMAIL_REVIEW !== "true", "Change-email coverage uses the dedicated mock-auth export.");

const viewports = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-393", width: 393, height: 852 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 }
];

for (const viewport of viewports) {
  for (const variant of ["before resend", "after resend"] as const) {
    test(`verifies the changed-email OTP ${variant} at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("");
      await page.getByRole("button", { name: "Đăng ký" }).click();
      await page.getByLabel("Email").fill("qa-original@example.com");
      await page.getByRole("button", { name: "Gửi OTP" }).click();
      await page.getByLabel("Mã OTP").fill("12");

      if (variant === "after resend") {
        const resend = page.getByRole("button", { name: "Gửi lại mã OTP" });
        await expect(resend).toBeEnabled({ timeout: 2_000 });
        await resend.click();
      }

      await page.getByRole("button", { name: "Đổi email" }).click();
      await expect(page.getByLabel("Email")).toHaveValue("qa-original@example.com");
      await page.getByLabel("Email").fill("zz-changed@example.com");
      await page.getByRole("button", { name: "Gửi OTP" }).click();
      await expect(page.getByLabel("Mã OTP")).toHaveValue("");
      await page.getByLabel("Mã OTP").fill("123456");
      await page.getByRole("button", { name: "Tiếp tục" }).click();
      await expect(page.getByLabel("Họ và tên (bắt buộc)")).toBeVisible();
    });
  }
}
