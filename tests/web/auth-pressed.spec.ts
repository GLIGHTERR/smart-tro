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

for (const pointer of ["mouse", "touch"] as const) {
  test(`applies the sign-in pressed opacity during ${pointer} pointer input`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("");
    const button = page.getByRole("button", { name: "Đăng nhập", exact: true });
    await button.hover();
    await expect(button).toHaveCSS("opacity", "1");
    await expectPressedOpacity(page, button, pointer);
  });
}
