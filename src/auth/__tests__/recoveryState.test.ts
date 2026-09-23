import {
  RECOVERY_CREDENTIAL_TTL_MS,
  RECOVERY_EXPIRED_ERROR,
  RECOVERY_GENERIC_NOTICE,
  RECOVERY_RESEND_COOLDOWN_MS,
  backRecovery,
  createRecoveryState,
  getResendSeconds,
  resendRecoveryOtp,
  resumeRecovery,
  sanitizeRecoveryOtp,
  submitRecoveryEmail,
  submitRecoveryOtp,
  submitRecoveryPassword,
} from "../recoveryState";

const now = 1_000_000;

describe("forgot-password recovery state", () => {
  it("starts clean and can seed each review-only screen", () => {
    expect(createRecoveryState("email", now)).toMatchObject({ step: "email", email: "", challengeExpiresAt: 0, resetExpiresAt: 0, notice: "" });
    expect(createRecoveryState("otp", now)).toMatchObject({ step: "otp", email: "mai@example.com", challengeExpiresAt: now + RECOVERY_CREDENTIAL_TTL_MS, resendAvailableAt: now + RECOVERY_RESEND_COOLDOWN_MS, notice: RECOVERY_GENERIC_NOTICE });
    expect(createRecoveryState("password", now)).toMatchObject({ step: "password", resetExpiresAt: now + RECOVERY_CREDENTIAL_TTL_MS });
  });

  it("rejects malformed email and normalizes a valid request", () => {
    const invalid = submitRecoveryEmail({ ...createRecoveryState("email", now), email: "bad" }, now);
    expect(invalid.error).toBe("Nhập địa chỉ email hợp lệ.");
    const submitted = submitRecoveryEmail({ ...invalid, email: " Mai@Example.COM " }, now);
    expect(submitted).toMatchObject({ step: "otp", email: "mai@example.com", otp: "", notice: RECOVERY_GENERIC_NOTICE, error: "", resetExpiresAt: 0 });
    expect(submitted.challengeExpiresAt).toBe(now + RECOVERY_CREDENTIAL_TTL_MS);
  });

  it("keeps only six OTP digits", () => {
    expect(sanitizeRecoveryOtp("1a23-4567")).toBe("123456");
  });

  it("validates OTP shape and expiry before moving to password", () => {
    const otpState = { ...createRecoveryState("otp", now), otp: "123" };
    expect(submitRecoveryOtp(otpState, now).error).toBe("Nhập đủ 6 chữ số.");
    expect(submitRecoveryOtp({ ...otpState, otp: "123456" }, now)).toMatchObject({ step: "password", resetExpiresAt: now + RECOVERY_CREDENTIAL_TTL_MS, notice: "", error: "" });
    expect(submitRecoveryOtp({ ...otpState, challengeExpiresAt: now }, now)).toMatchObject({ step: "email", error: RECOVERY_EXPIRED_ERROR });
  });

  it("enforces resend cooldown and replaces the in-memory challenge", () => {
    const state = { ...createRecoveryState("otp", now), otp: "123456", error: "old" };
    expect(resendRecoveryOtp(state, now)).toBe(state);
    const resent = resendRecoveryOtp(state, now + RECOVERY_RESEND_COOLDOWN_MS);
    expect(resent).toMatchObject({ otp: "", error: "", notice: RECOVERY_GENERIC_NOTICE });
    expect(resent.challengeExpiresAt).toBe(now + RECOVERY_RESEND_COOLDOWN_MS + RECOVERY_CREDENTIAL_TTL_MS);
  });

  it("validates password policy, confirmation, expiry, and successful completion", () => {
    const state = createRecoveryState("password", now);
    expect(submitRecoveryPassword({ ...state, password: "weak", confirmPassword: "weak" }, now).state.error).toContain("ít nhất 8 ký tự");
    expect(submitRecoveryPassword({ ...state, password: "Strong!1", confirmPassword: "Other!1" }, now).state.error).toBe("Xác nhận mật khẩu chưa khớp.");
    expect(submitRecoveryPassword({ ...state, resetExpiresAt: now }, now).state).toMatchObject({ step: "email", error: RECOVERY_EXPIRED_ERROR });
    expect(submitRecoveryPassword({ ...state, password: "Strong!1", confirmPassword: "Strong!1" }, now)).toMatchObject({ state: { step: "email" }, completedEmail: "mai@example.com" });
  });

  it("clears passwords on resume and resets expired credentials", () => {
    const passwordState = { ...createRecoveryState("password", now), password: "Strong!1", confirmPassword: "Strong!1" };
    expect(resumeRecovery(passwordState, now)).toMatchObject({ step: "password", password: "", confirmPassword: "" });
    expect(resumeRecovery({ ...passwordState, resetExpiresAt: now }, now)).toMatchObject({ step: "email", error: RECOVERY_EXPIRED_ERROR });
    expect(resumeRecovery({ ...createRecoveryState("otp", now), challengeExpiresAt: now }, now)).toMatchObject({ step: "email", error: RECOVERY_EXPIRED_ERROR });
    expect(resumeRecovery(createRecoveryState("email", now), now)).toMatchObject({ step: "email", password: "", confirmPassword: "" });
  });

  it("supports back navigation, restart, and countdown boundaries", () => {
    expect(backRecovery(createRecoveryState("password", now))).toMatchObject({ step: "otp", resetExpiresAt: 0, notice: RECOVERY_GENERIC_NOTICE });
    expect(backRecovery(createRecoveryState("otp", now))).toMatchObject({ step: "email", email: "" });
    const state = { ...createRecoveryState("otp", now), resendAvailableAt: now + 60_001 };
    expect(getResendSeconds(state, now)).toBe(61);
    expect(getResendSeconds(state, now + 60_001)).toBe(0);
  });
});
