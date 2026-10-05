import { expect, test } from "@playwright/test";

const actions = [
  ["Hợp đồng", "UC-07 — Hợp đồng điện tử của tôi", "contract"],
  ["Tin nhắn", "UC-15 — Tin nhắn", "messages"],
  ["Tài khoản", "UC-04 — Tài khoản/Cá nhân", "account"],
  ["D.S.Trọ", "UC-10 — Danh sách phòng available", "properties"],
  ["T.Toán", "Thanh Toán", "payment"],
  ["Báo cáo", "UC-18 — Danh sách báo cáo sự cố", "reports"],
] as const;

async function openHome(page: import("@playwright/test").Page, scenario: string, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(`?home=${scenario}`);
  await expect(page.getByText("Xin chào")).toBeVisible();
  if (scenario !== "error") await expect(page.getByText("Nguyễn Văn A")).toBeVisible();
}

async function expectNavigation(page: import("@playwright/test").Page, action: readonly [string, string, string]) {
  const [label, destination, route] = action;
  await page.getByRole("button", { name: `${label}: ${destination}` }).click();
  await expect(page).toHaveURL(new RegExp(`/destination/${route}$`));
  await expect(page.getByRole("heading", { name: destination })).toBeVisible();
  await page.getByRole("button", { name: "Quay lại Trang chủ" }).click();
  await expect(page).toHaveURL(/\/smart-tro\/(?:\?home=.*)?$/);
}

test("every Home action changes the web route and displays its approved destination on mobile", async ({ page }) => {
  await openHome(page, "single", { width: 393, height: 852 });
  for (const action of actions) await expectNavigation(page, action);
});

test("multiple contracts preserve all six web navigation outcomes on desktop", async ({ page }) => {
  await openHome(page, "multiple", { width: 1280, height: 900 });
  for (const action of actions) await expectNavigation(page, action);
});

test("the no-contract and error fixtures retain their five available web navigation outcomes", async ({ page }) => {
  await openHome(page, "none", { width: 393, height: 852 });
  for (const action of actions.slice(0, 5)) await expectNavigation(page, action);

  await openHome(page, "error", { width: 1280, height: 900 });
  await expect(page.getByText("Chưa thể tải tóm tắt hợp đồng.")).toBeVisible();
  for (const action of actions.slice(0, 5)) await expectNavigation(page, action);
});
