import { expect, test } from "@playwright/test";

test.skip(process.env.AUTH_PASSWORD_RADIUS_REVIEW !== "true", "Password field radius checks use the dedicated auth export.");
test.use({ hasTouch: true });

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
    const field = container.locator("..");
    const reveal = page.getByRole("button", { name: "Hiện mật khẩu", exact: true });
    const expectedField = { radius: "24px", height: "48px", background: "rgb(251, 201, 126)" };

    await expect(email).toHaveCSS("border-radius", expectedField.radius);
    await expect(email).toHaveCSS("height", expectedField.height);
    await expect(email).toHaveCSS("background-color", expectedField.background);
    await expect(container).toHaveCSS("border-radius", expectedField.radius);
    await expect(container).toHaveCSS("height", expectedField.height);
    await expect(container).toHaveCSS("background-color", expectedField.background);
    await expect(container).toHaveCSS("overflow", "hidden");

    // The visual field must contain the entire interactive reveal target, not
    // merely leave it in the DOM beside a clipped input.
    const fieldBox = await field.boundingBox();
    const revealBox = await reveal.boundingBox();
    expect(fieldBox).not.toBeNull();
    expect(revealBox).not.toBeNull();
    expect(revealBox!.x).toBeGreaterThanOrEqual(fieldBox!.x);
    expect(revealBox!.y).toBeGreaterThanOrEqual(fieldBox!.y);
    expect(revealBox!.x + revealBox!.width).toBeLessThanOrEqual(fieldBox!.x + fieldBox!.width);
    expect(revealBox!.y + revealBox!.height).toBeLessThanOrEqual(fieldBox!.y + fieldBox!.height);
    await expect(reveal).toHaveJSProperty("tagName", "BUTTON");
    await expect(reveal).toHaveJSProperty("disabled", false);
    const revealReceivesPointer = await reveal.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return hit === element || element.contains(hit);
    });
    expect(revealReceivesPointer).toBe(true);
    await reveal.click();
    await expect(page.getByRole("button", { name: "Ẩn mật khẩu", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Ẩn mật khẩu", exact: true }).tap();
    await expect(reveal).toBeVisible();

    await password.focus();
    await expect(password).toHaveCSS("outline-width", "0px");
    await expect(field).toHaveCSS("border-top-width", "1px");
    await expect(field).toHaveCSS("border-top-color", "rgb(0, 0, 0)");
    await expect(field).toHaveCSS("border-radius", expectedField.radius);

    await password.fill("Strong!1");
    await reveal.focus();
    await expect(reveal).toBeFocused();
    await page.keyboard.press("Space");
    const conceal = page.getByRole("button", { name: "Ẩn mật khẩu", exact: true });
    await expect(conceal).toBeFocused();
    await page.keyboard.press("Space");
    await expect(reveal).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(conceal).toBeFocused();
    await expect(container).toHaveCSS("border-radius", expectedField.radius);
    await expect(conceal).toBeVisible();
    await expect(container).toHaveCSS("border-radius", expectedField.radius);
    const concealBox = await conceal.boundingBox();
    expect(concealBox?.width).toBeGreaterThanOrEqual(48);
    expect(concealBox?.height).toBeGreaterThanOrEqual(48);

    await email.fill("invalid");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.getByText("Nhập địa chỉ email hợp lệ.")).toBeVisible();
    await expect(container).toHaveCSS("border-radius", expectedField.radius);
  });
}
