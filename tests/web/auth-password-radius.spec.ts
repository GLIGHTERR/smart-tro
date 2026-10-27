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
    const emailField = email.locator("..").locator("..");
    const readWrapperChrome = (wrapper: typeof field) => wrapper.evaluate((element) => {
      const computed = getComputedStyle(element);
      return [computed.borderTopWidth, computed.borderTopColor, computed.borderRadius];
    });
    const expectFocusedWrapper = async (wrapper: typeof field) => {
      await expect(wrapper).toHaveCSS("border-radius", expectedField.radius);
      await expect(wrapper).toHaveCSS("border-top-width", "1px");
      await expect(wrapper).toHaveCSS("border-top-color", "rgb(0, 0, 0)");
    };
    const expectSingleChromeOwner = async (focused: boolean) => {
      await expect(field).toHaveCSS("border-radius", expectedField.radius);
      await expect(field).toHaveCSS("border-top-width", focused ? "1px" : "0px");
      if (focused) await expect(field).toHaveCSS("border-top-color", "rgb(0, 0, 0)");
      for (const property of ["border-top-width", "border-right-width", "border-bottom-width", "border-left-width", "outline-width", "border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius"]) {
        await expect(password).toHaveCSS(property, "0px");
      }
      await expect(password).toHaveCSS("outline-style", "solid");
      await expect(password).toHaveCSS("outline-color", "rgba(0, 0, 0, 0)");
    };

    await expect(email).toHaveCSS("height", expectedField.height);
    await expect(email).toHaveCSS("background-color", expectedField.background);
    await expect(emailField).toHaveCSS("border-top-width", "0px");
    await expect(container).toHaveCSS("border-radius", "0px");
    await expect(container).toHaveCSS("height", expectedField.height);
    await expect(container).toHaveCSS("background-color", expectedField.background);
    await expect(container).toHaveCSS("overflow", "hidden");
    await expectSingleChromeOwner(false);

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
    await expectSingleChromeOwner(true);
    await page.getByRole("button", { name: "Ẩn mật khẩu", exact: true }).tap();
    await expect(reveal).toBeVisible();
    await expectSingleChromeOwner(true);

    // Email and Password must expose identical wrapper chrome for each focus origin.
    await email.focus();
    await expectFocusedWrapper(emailField);
    const keyboardEmailChrome = await readWrapperChrome(emailField);
    await password.focus();
    await expectSingleChromeOwner(true);
    expect(await readWrapperChrome(field)).toEqual(keyboardEmailChrome);

    await email.click();
    await expectFocusedWrapper(emailField);
    const mouseEmailChrome = await readWrapperChrome(emailField);
    await password.click();
    await expectSingleChromeOwner(true);
    expect(await readWrapperChrome(field)).toEqual(mouseEmailChrome);

    await email.tap();
    await expectFocusedWrapper(emailField);
    const touchEmailChrome = await readWrapperChrome(emailField);
    await password.tap();
    await expectSingleChromeOwner(true);
    expect(await readWrapperChrome(field)).toEqual(touchEmailChrome);

    await password.fill("Strong!1");
    await reveal.focus();
    await expect(reveal).toBeFocused();
    await expectSingleChromeOwner(true);
    await page.keyboard.press("Space");
    const conceal = page.getByRole("button", { name: "Ẩn mật khẩu", exact: true });
    await expect(conceal).toBeFocused();
    await page.keyboard.press("Space");
    await expect(reveal).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(conceal).toBeFocused();
    await expect(field).toHaveCSS("border-radius", expectedField.radius);
    await expect(conceal).toBeVisible();
    await expect(field).toHaveCSS("border-radius", expectedField.radius);
    const concealBox = await conceal.boundingBox();
    expect(concealBox?.width).toBeGreaterThanOrEqual(48);
    expect(concealBox?.height).toBeGreaterThanOrEqual(48);

    await email.fill("invalid");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.getByText("Nhập địa chỉ email hợp lệ.")).toBeVisible();
    await expect(field).toHaveCSS("border-radius", expectedField.radius);
  });
}
