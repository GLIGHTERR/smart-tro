import { expect, test } from "@playwright/test";

test.skip(process.env.AUTH_PASSWORD_RADIUS_REVIEW !== "true", "Password field radius checks use the dedicated auth export.");

for (const viewport of [
  { name: "320x568", width: 320, height: 568 },
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 }
]) {
  test(`keeps the sign-in password field clipped and touch-sized at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("");

    const email = page.getByLabel("Email");
    const password = page.getByLabel("Mật khẩu", { exact: true });
    const container = password.locator("..");
    const reveal = page.getByLabel("Hiện mật khẩu");
    const expectedField = { radius: "24px", height: "48px", background: "rgb(251, 201, 126)" };

    await expect(email).toHaveCSS("border-radius", expectedField.radius);
    await expect(email).toHaveCSS("height", expectedField.height);
    await expect(email).toHaveCSS("background-color", expectedField.background);
    await expect(container).toHaveCSS("border-radius", expectedField.radius);
    await expect(container).toHaveCSS("height", expectedField.height);
    await expect(container).toHaveCSS("background-color", expectedField.background);
    await expect(container).toHaveCSS("overflow", "hidden");

    await password.fill("Strong!1");
    await password.focus();
    await expect(container).toHaveCSS("border-radius", expectedField.radius);
    await reveal.click();
    const conceal = page.getByLabel("Ẩn mật khẩu");
    await expect(conceal).toBeVisible();
    await expect(container).toHaveCSS("border-radius", expectedField.radius);
    const revealBox = await conceal.boundingBox();
    expect(revealBox?.width).toBeGreaterThanOrEqual(48);
    expect(revealBox?.height).toBeGreaterThanOrEqual(48);

    await email.fill("invalid");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.getByText("Nhập địa chỉ email hợp lệ.")).toBeVisible();
    await expect(container).toHaveCSS("border-radius", expectedField.radius);
  });
}
