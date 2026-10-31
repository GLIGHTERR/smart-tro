import type { Page } from "@playwright/test";

export async function mockSignupApi(page: Page) {
  let sequence = 0;
  const completedProfiles: { phone: string | null }[] = [];
  await page.route("https://auth-fixture.invalid/auth/signup/otp/request", async (route) => {
    sequence += 1;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ accepted: true, attemptId: `attempt-${sequence}`, expiresInSeconds: 600, resendAfterSeconds: 0 }) });
  });
  await page.route("https://auth-fixture.invalid/auth/signup/otp/verify", async (route) => {
    const { attemptId } = route.request().postDataJSON() as { attemptId: string };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ verified: true, attemptId, expiresInSeconds: 600 }) });
  });
  await page.route("https://auth-fixture.invalid/auth/signup/complete", async (route) => {
    const { phone } = route.request().postDataJSON() as { phone: string | null };
    completedProfiles.push({ phone });
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ created: true, next: "sign_in" }) });
  });
  return { completedProfiles };
}
