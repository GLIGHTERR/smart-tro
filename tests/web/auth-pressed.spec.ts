import { expect, test, type Locator, type Page } from "@playwright/test";

test.skip(process.env.AUTH_PRESSED_REVIEW !== "true", "Pressed-state coverage uses the dedicated mock-auth export.");

async function expectPressedOpacity(page: Page, button: Locator, pointer: "mouse" | "touch") {
  if (pointer === "touch") {
    const box = await button.boundingBox();
    if (!box) throw new Error("Sign-in button is not visible");
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
    await expect(button).toHaveCSS("opacity", "0.55");
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(button).toHaveCSS("opacity", "1");
    return;
  }
  const box = await button.boundingBox();
  if (!box) throw new Error("Sign-in button is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(button).toHaveCSS("opacity", "0.55");
  await page.mouse.up();
  await expect(button).toHaveCSS("opacity", "1");
}

async function expectCenteredLabel(button: Locator) {
  const buttonBox = await button.boundingBox();
  const labelBox = await button.getByText("Đăng nhập", { exact: true }).boundingBox();
  if (!buttonBox || !labelBox) throw new Error("Sign-in button or label is not visible");

  expect(Math.abs((labelBox.x + labelBox.width / 2) - (buttonBox.x + buttonBox.width / 2))).toBeLessThanOrEqual(1);
  expect(Math.abs((labelBox.y + labelBox.height / 2) - (buttonBox.y + buttonBox.height / 2))).toBeLessThanOrEqual(1);
}

for (const pointer of ["mouse", "touch"] as const) {
  test(`keeps the sign-in label centered and applies pressed opacity during ${pointer} pointer input`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("");
    const button = page.getByRole("button", { name: "Đăng nhập", exact: true });
    await button.hover();
    await expect(button).toHaveCSS("opacity", "1");
    await expectCenteredLabel(button);
    await expectPressedOpacity(page, button, pointer);
    await expectCenteredLabel(button);
  });
}
