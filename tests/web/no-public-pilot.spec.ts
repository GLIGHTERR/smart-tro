import { expect, test } from "@playwright/test";

test("does not serve the retired pilot path from the normal Pages artifact", async ({ page }) => {
  const response = await page.goto("qa-pilot/retired-release");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "G1 UI pilot" })).toHaveCount(0);
});
