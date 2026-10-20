import { expect, test } from "@playwright/test";

test.skip(process.env.UI_PILOT_REVIEW !== "true", "Requires the isolated pilot export");

test("pilot keyboard, validation, dialog and one-shot status", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "G1 UI pilot" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Disabled" })).toBeDisabled();
  const input = page.getByLabel("Name");
  await input.focus();
  await expect(input).toBeFocused();
  await page.getByRole("button", { name: "Validate" }).click();
  await expect(page.getByRole("alert")).toContainText("Name is required");
  await input.fill("Anh");
  await expect(page.getByRole("alert")).toHaveCount(0);

  const opener = page.getByRole("button", { name: "Open dialog" });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Pilot dialog" });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole("button", { name: "Close" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(input).toHaveValue("Anh");

  await page.getByRole("button", { name: "Show toast" }).click();
  const status = page.getByRole("status");
  await expect(status).toContainText("Saved");
  await expect(status).toHaveAttribute("aria-live", "polite");
  await page.getByRole("button", { name: "Navigate" }).click();
  await expect(page.getByText("Page 2")).toBeVisible();
  await expect(status).toBeVisible();
  await page.getByRole("button", { name: "Go back" }).click();
  await expect(input).toHaveValue("Anh");
  await expect(status).toBeVisible();
  await expect(status).toHaveCount(0, { timeout: 7000 });
  await page.reload();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByRole("button", { name: "Show long toast" }).click();
  const longStatus = page.getByRole("status");
  await expect(longStatus).toContainText("continue navigating");
  const bounds = await longStatus.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeLessThanOrEqual(272);
  expect(await longStatus.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  expect(await longStatus.locator("[dir=auto]").evaluate((node) => getComputedStyle(node).color)).toBe("rgb(255, 255, 255)");
  expect(errors).toEqual([]);
});
