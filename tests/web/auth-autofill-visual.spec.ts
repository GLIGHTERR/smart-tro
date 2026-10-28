import { expect, test } from "@playwright/test";

test.skip(process.env.AUTH_AUTOFILL_REVIEW !== "true", "Autofill visual coverage uses the dedicated auth export.");

const viewports = [
  { name: "320", width: 320, height: 568 },
  { name: "375", width: 375, height: 812 },
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
];

for (const viewport of viewports) {
  test(`keeps equivalent-autofill paint continuous at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("");
    const password = page.getByLabel("Mật khẩu", { exact: true });
    const field = page.getByTestId("auth-field-Mật khẩu");
    const reveal = page.getByRole("button", { name: "Hiện mật khẩu", exact: true });

    // Chromium does not expose a stable credential-manager action to
    // Playwright. This is the deterministic equivalent paint state; it uses
    // the same inset surface contract as the production autofill selector.
    await page.addStyleTag({ content: '[data-auth-field="shell"] input[data-autofill-equivalent] { -webkit-box-shadow: 0 0 0 1000px #FBC97E inset !important; -webkit-text-fill-color: #5B4126 !important; }' });
    await password.evaluate((input) => input.setAttribute("data-autofill-equivalent", "true"));
    expect(await page.locator("style#auth-field-autofill-surface").textContent()).toContain("input:-webkit-autofill");

    await expect(password).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(reveal).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(field).toHaveScreenshot(`auth-password-autofill-${viewport.name}.png`);
  });
}
