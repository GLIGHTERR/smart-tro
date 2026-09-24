import { createMockAuthGateway } from "../mockGateway";

const expectCode = async (promise: Promise<unknown>, code: string) => await expect(promise).rejects.toMatchObject({ code });

describe("preview auth gateway", () => {
  let now: number;
  beforeEach(() => { now = 1_000; });
  const gateway = () => createMockAuthGateway(() => now);

  it("creates, verifies, and signs in a new account without exposing OTP", async () => {
    const auth = gateway(); const attempt = await auth.requestOtp("mai@example.com");
    expect(attempt).toEqual({ attemptId: "preview-1", expiresAt: 601000, resendAvailableAt: 61000 });
    await auth.verifyOtp("mai@example.com", attempt.attemptId, "123456"); await auth.createAccount("mai@example.com", attempt.attemptId, "123456", "Strong!1");
    await expect(auth.signIn("mai@example.com", "Strong!1")).resolves.toEqual({ accessToken: "preview-access-token", refreshToken: "preview-refresh-token" });
  });
  it("rejects invalid credentials and routes unverified accounts distinctly", async () => {
    const auth = gateway();
    await expectCode(auth.signIn("missing@example.com", "x"), "INVALID_CREDENTIALS");
    await expectCode(auth.signIn("demo@smarttro.vn", "wrong"), "INVALID_CREDENTIALS");
    await expectCode(auth.signIn("unverified@smarttro.vn", "SmartTro!1"), "ACCOUNT_UNVERIFIED");
  });
  it("expires challenges and limits OTP failures", async () => {
    const auth = gateway(); const attempt = await auth.requestOtp("mai@example.com");
    for (let count = 0; count < 4; count += 1) await expectCode(auth.verifyOtp("mai@example.com", attempt.attemptId, "000000"), "INVALID_OTP");
    await expectCode(auth.verifyOtp("mai@example.com", attempt.attemptId, "000000"), "OTP_ATTEMPTS_EXHAUSTED");
    await expectCode(auth.verifyOtp("mai@example.com", attempt.attemptId, "123456"), "OTP_ATTEMPTS_EXHAUSTED");
    now += 600001;
    await expectCode(auth.verifyOtp("mai@example.com", attempt.attemptId, "123456"), "OTP_EXPIRED");
  });
  it("uses the system clock when no test clock is supplied", async () => {
    const attempt = await createMockAuthGateway().requestOtp("clock@example.com");
    expect(attempt.expiresAt - attempt.resendAvailableAt).toBe(540000);
  });
  it("enforces resend cooldown and five resends per hour", async () => {
    const auth = gateway(); const attempt = await auth.requestOtp("mai@example.com");
    await expectCode(auth.resendOtp("mai@example.com"), "RESEND_COOLDOWN");
    for (let count = 0; count < 5; count += 1) { now += 60000; await expect(auth.resendOtp("mai@example.com")).resolves.toEqual({ attemptId: attempt.attemptId, expiresAt: now + 600000, resendAvailableAt: now + 60000 }); }
    now += 60000;
    await expectCode(auth.resendOtp("mai@example.com"), "RESEND_LIMIT");
  });
  it("does not overwrite an existing account", async () => {
    const auth = gateway(); const attempt = await auth.requestOtp("demo@smarttro.vn");
    await auth.verifyOtp("demo@smarttro.vn", attempt.attemptId, "123456");
    await expectCode(auth.createAccount("demo@smarttro.vn", attempt.attemptId, "123456", "NewPass!1"), "ACCOUNT_EXISTS");
  });
  it("keeps mock session methods available only for local previews", async () => {
    const auth = gateway();
    await expectCode(auth.resendOtp("missing@example.com"), "OTP_EXPIRED");
    await expect(auth.refresh("preview-refresh-token")).resolves.toEqual({ accessToken: "preview-access-token", refreshToken: "preview-refresh-token" });
    await expect(auth.me("preview-access-token")).resolves.toBeUndefined();
    await expect(auth.logout("preview-refresh-token")).resolves.toBeUndefined();
  });

  it("previews the complete recovery flow with a one-time reset token", async () => {
    const auth = gateway();
    const challenge = await auth.requestPasswordRecovery("demo@smarttro.vn");
    expect(challenge).toEqual({ challengeId: "recovery-1", expiresAt: 601000, resendAvailableAt: 61000 });
    const credential = await auth.verifyPasswordRecovery("demo@smarttro.vn", challenge.challengeId, "123456");
    expect(credential).toEqual({ resetToken: "preview-reset-2", expiresAt: 601000 });
    await expect(auth.resetPassword(credential.resetToken, "Changed!1", "Changed!1")).resolves.toEqual({ email: "demo@smarttro.vn", next: "sign_in" });
    await expectCode(auth.resetPassword(credential.resetToken, "Other!1", "Other!1"), "PASSWORD_RESET_TOKEN_INVALID");
    await expect(auth.signIn("demo@smarttro.vn", "Changed!1")).resolves.toEqual(expect.objectContaining({ accessToken: "preview-access-token" }));
  });

  it("keeps recovery generic and enforces identity, attempts, expiry, confirmation, and password reuse", async () => {
    const auth = gateway();
    const missing = await auth.requestPasswordRecovery("missing@example.com");
    await expectCode(auth.verifyPasswordRecovery("missing@example.com", missing.challengeId, "123456"), "PASSWORD_RECOVERY_OTP_INVALID");
    const unverified = await auth.requestPasswordRecovery("unverified@smarttro.vn");
    await expectCode(auth.verifyPasswordRecovery("unverified@smarttro.vn", unverified.challengeId, "123456"), "PASSWORD_RECOVERY_OTP_INVALID");
    const mismatch = await auth.requestPasswordRecovery("demo@smarttro.vn");
    await expectCode(auth.verifyPasswordRecovery("other@example.com", mismatch.challengeId, "123456"), "PASSWORD_RECOVERY_OTP_INVALID");
    for (let count = 0; count < 4; count += 1) await expectCode(auth.verifyPasswordRecovery("demo@smarttro.vn", mismatch.challengeId, "000000"), "PASSWORD_RECOVERY_OTP_INVALID");
    await expectCode(auth.verifyPasswordRecovery("demo@smarttro.vn", mismatch.challengeId, "123456"), "PASSWORD_RECOVERY_OTP_INVALID");

    const valid = await auth.requestPasswordRecovery("demo@smarttro.vn");
    const credential = await auth.verifyPasswordRecovery("demo@smarttro.vn", valid.challengeId, "123456");
    await expectCode(auth.resetPassword(credential.resetToken, "Changed!1", "Other!1"), "PASSWORD_CONFIRMATION_MISMATCH");
    await expectCode(auth.resetPassword(credential.resetToken, "SmartTro!1", "SmartTro!1"), "PASSWORD_UNCHANGED");
    now += 600001;
    await expectCode(auth.resetPassword(credential.resetToken, "Changed!1", "Changed!1"), "PASSWORD_RESET_TOKEN_INVALID");
  });
});
