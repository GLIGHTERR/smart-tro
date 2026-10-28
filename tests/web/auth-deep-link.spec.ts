import { expect, test } from "@playwright/test";

test.skip(process.env.AUTH_DEEP_LINK_REVIEW !== "true", "Deep-link coverage uses the dedicated mock-auth export.");

const viewports = [
  { name: "mobile-320", width: 320, height: 568 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
];

for (const viewport of viewports) {
  test(`renders Sign In after a GitHub Pages-style Auth deep-link reload at ${viewport.name}`, async ({ page, context }) => {
    await page.setViewportSize(viewport);

    const deepLink = await page.goto("Auth");
    expect(deepLink?.status()).toBe(404);
    await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeVisible();

    const reload = await page.reload();
    expect(reload?.status()).toBe(404);
    await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeVisible();
    await expect(page.getByText("Trang chủ")).toHaveCount(0);
    await expect(context.cookies()).resolves.toEqual([]);
    await expect(page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))).resolves.toEqual({ local: [], session: [] });
  });
}
