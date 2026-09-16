import { createMockAuthGateway } from "../mockGateway";

const expectCode = async (promise: Promise<unknown>, code: string) => await expect(promise).rejects.toMatchObject({ code });

describe("preview auth gateway", () => {
  let now: number;
  beforeEach(() => { now = 1_000; });
  const gateway = () => createMockAuthGateway(() => now);

  it("creates, verifies, and signs in a new account without exposing OTP", async () => {
    const auth = gateway(); const attempt = await auth.requestOtp("mai@example.com");
    expect(attempt).toEqual({ attemptId: "preview-1", expiresAt: 601000, resendAvailableAt: 61000 });
    await auth.verifyOtp(attempt.attemptId, "123456"); await auth.createAccount(attempt.attemptId, "Strong!1");
    await expect(auth.signIn("mai@example.com", "Strong!1")).resolves.toBeUndefined();
  });
  it("rejects invalid credentials and routes unverified accounts distinctly", async () => {
    const auth = gateway();
    await expectCode(auth.signIn("missing@example.com", "x"), "INVALID_CREDENTIALS");
    await expectCode(auth.signIn("demo@smarttro.vn", "wrong"), "INVALID_CREDENTIALS");
    await expectCode(auth.signIn("unverified@smarttro.vn", "SmartTro!1"), "ACCOUNT_UNVERIFIED");
  });
  it("expires challenges and limits OTP failures", async () => {
    const auth = gateway(); const attempt = await auth.requestOtp("mai@example.com");
    for (let count = 0; count < 4; count += 1) await expectCode(auth.verifyOtp(attempt.attemptId, "000000"), "INVALID_OTP");
    await expectCode(auth.verifyOtp(attempt.attemptId, "000000"), "OTP_ATTEMPTS_EXHAUSTED");
    await expectCode(auth.verifyOtp(attempt.attemptId, "123456"), "OTP_ATTEMPTS_EXHAUSTED");
    now += 600001;
    await expectCode(auth.verifyOtp(attempt.attemptId, "123456"), "OTP_EXPIRED");
  });
  it("uses the system clock when no test clock is supplied", async () => {
    const attempt = await createMockAuthGateway().requestOtp("clock@example.com");
    expect(attempt.expiresAt - attempt.resendAvailableAt).toBe(540000);
  });
  it("enforces resend cooldown and five resends per hour", async () => {
    const auth = gateway(); const attempt = await auth.requestOtp("mai@example.com");
    await expectCode(auth.resendOtp(attempt.attemptId), "RESEND_COOLDOWN");
    for (let count = 0; count < 5; count += 1) { now += 60000; await expect(auth.resendOtp(attempt.attemptId)).resolves.toEqual({ expiresAt: now + 600000, resendAvailableAt: now + 60000 }); }
    now += 60000;
    await expectCode(auth.resendOtp(attempt.attemptId), "RESEND_LIMIT");
  });
  it("does not overwrite an existing account", async () => {
    const auth = gateway(); const attempt = await auth.requestOtp("demo@smarttro.vn");
    await auth.verifyOtp(attempt.attemptId, "123456");
    await expectCode(auth.createAccount(attempt.attemptId, "NewPass!1"), "ACCOUNT_EXISTS");
  });
});
