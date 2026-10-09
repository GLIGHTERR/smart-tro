import { expect, test, type Locator } from "@playwright/test";

test.skip(process.env.AUTH_TOUCH_TARGET_REVIEW !== "true", "Touch-target coverage uses the dedicated mock-auth export.");

const viewports = [
  { name: "mobile-320", width: 320, height: 568 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
];

async function expectTouchTarget(control: Locator) {
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(48);
  expect(box!.width).toBeGreaterThanOrEqual(48);
}

for (const viewport of viewports) {
  test(`keeps auth link targets and keyboard navigation accessible at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("");

    const forgotPassword = page.getByRole("button", { name: "Quên mật khẩu", exact: true });
    const signUp = page.getByRole("button", { name: "Đăng ký", exact: true });
    await expectTouchTarget(forgotPassword);
    await expectTouchTarget(signUp);
    await signUp.focus();
    await expect(signUp).toBeFocused();
    await page.keyboard.press("Enter");

    const signIn = page.getByRole("button", { name: "Đăng nhập", exact: true });
    await expectTouchTarget(signIn);
    await page.getByLabel("Email").fill("touch-target@example.com");
    await page.getByRole("button", { name: "Gửi OTP", exact: true }).click();

    const changeEmail = page.getByRole("button", { name: "Đổi email", exact: true });
    await expectTouchTarget(changeEmail);
    await changeEmail.focus();
    await expect(changeEmail).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Email")).toHaveValue("touch-target@example.com");
  });
}
