import {
  RECOVERY_CREDENTIAL_TTL_MS,
  RECOVERY_EXPIRED_ERROR,
  RECOVERY_GENERIC_NOTICE,
  RECOVERY_MAX_OTP_ATTEMPTS,
  RECOVERY_RESEND_COOLDOWN_MS,
  acceptRecoveryChallenge,
  acceptRecoveryVerification,
  applyRecoveryError,
  backRecovery,
  canResendRecoveryOtp,
  completeRecovery,
  createRecoveryState,
  createRecoverySubmissionGuard,
  getRecoveryRetrySeconds,
  getResendSeconds,
  prepareRecoveryEmail,
  prepareRecoveryOtp,
  prepareRecoveryPassword,
  resumeRecovery,
  sanitizeRecoveryOtp,
} from "../recoveryState";

const now = 1_000_000;

describe("forgot-password recovery state", () => {
  it("suppresses concurrent submissions and unlocks after success or failure", async () => {
    const guard = createRecoverySubmissionGuard();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const operation = jest.fn(() => pending);
    const first = guard.run(operation);
    await expect(guard.run(operation)).resolves.toBe(false);
    expect(operation).toHaveBeenCalledTimes(1);
    release();
    await expect(first).resolves.toBe(true);
    await expect(guard.run(async () => { throw new Error("failed"); })).rejects.toThrow("failed");
    await expect(guard.run(async () => undefined)).resolves.toBe(true);
  });

  it("starts clean and can seed each review-only screen without persisted state", () => {
    expect(createRecoveryState("email", now)).toMatchObject({ step: "email", email: "", challengeId: "", resetToken: "", challengeExpiresAt: 0, resetExpiresAt: 0, notice: "" });
    expect(createRecoveryState("otp", now)).toMatchObject({ step: "otp", email: "mai@example.com", challengeId: "review-challenge", challengeExpiresAt: now + RECOVERY_CREDENTIAL_TTL_MS, resendAvailableAt: now + RECOVERY_RESEND_COOLDOWN_MS, notice: RECOVERY_GENERIC_NOTICE });
    expect(createRecoveryState("password", now)).toMatchObject({ step: "password", resetToken: "review-reset-token", resetExpiresAt: now + RECOVERY_CREDENTIAL_TTL_MS });
    expect(createRecoveryState(undefined, now).step).toBe("email");
  });

  it("validates and normalizes email before applying the generic server challenge", () => {
    const invalid = prepareRecoveryEmail({ ...createRecoveryState("email", now), email: "bad", notice: "old" });
    expect(invalid).toMatchObject({ state: { error: "Nhập địa chỉ email hợp lệ.", notice: "" } });
    const prepared = prepareRecoveryEmail({ ...invalid.state, email: " Mai@Example.COM " });
    expect(prepared).toMatchObject({ value: "mai@example.com", state: { error: "" } });
    if (!("value" in prepared)) throw new Error("expected a valid email");
    const accepted = acceptRecoveryChallenge(prepared.state, prepared.value, { challengeId: "challenge-1", expiresAt: now + 10, resendAvailableAt: now + 5 });
    expect(accepted).toMatchObject({ step: "otp", email: "mai@example.com", challengeId: "challenge-1", resetToken: "", otpFailures: 0, challengeExpiresAt: now + 10, resendAvailableAt: now + 5, notice: RECOVERY_GENERIC_NOTICE, error: "" });
  });

  it("sanitizes, validates, and accepts the OTP result", () => {
    expect(sanitizeRecoveryOtp("1a23-4567")).toBe("123456");
    const otpState = { ...createRecoveryState("otp", now), otp: "123" };
    expect(prepareRecoveryOtp(otpState, now)).toMatchObject({ state: { error: "Nhập đủ 6 chữ số." } });
    expect(prepareRecoveryOtp({ ...otpState, challengeExpiresAt: now }, now)).toMatchObject({ state: { step: "email", error: RECOVERY_EXPIRED_ERROR } });
    expect(prepareRecoveryOtp({ ...otpState, otp: "123456" }, now)).toMatchObject({ value: "123456", state: { error: "" } });
    expect(acceptRecoveryVerification({ ...otpState, otp: "123456" }, { resetToken: "token-1", expiresAt: now + 100 })).toMatchObject({ step: "password", resetToken: "token-1", otp: "", password: "", confirmPassword: "", resetExpiresAt: now + 100, notice: "", error: "" });
  });

  it("uses server resend boundaries and resets the challenge after resend", () => {
    const state = { ...createRecoveryState("otp", now), resendAvailableAt: now + 60_001 };
    expect(canResendRecoveryOtp(state, now)).toBe(false);
    expect(canResendRecoveryOtp({ ...state, step: "email" }, now + 60_001)).toBe(false);
    expect(canResendRecoveryOtp(state, now + 60_001)).toBe(true);
    expect(getResendSeconds(state, now)).toBe(61);
    expect(getResendSeconds(state, now + 60_001)).toBe(0);
    expect(acceptRecoveryChallenge({ ...state, otp: "123456", otpFailures: 4 }, state.email, { challengeId: "challenge-2", expiresAt: now + 700_000, resendAvailableAt: now + 61_000 })).toMatchObject({ challengeId: "challenge-2", otp: "", otpFailures: 0 });
  });

  it("validates password policy, confirmation, expiry, and completion", () => {
    const state = createRecoveryState("password", now);
    expect(prepareRecoveryPassword({ ...state, password: "weak", confirmPassword: "weak" }, now).state.error).toContain("ít nhất 8 ký tự");
    expect(prepareRecoveryPassword({ ...state, password: "Strong!1", confirmPassword: "Other!1" }, now).state.error).toBe("Xác nhận mật khẩu chưa khớp.");
    expect(prepareRecoveryPassword({ ...state, resetExpiresAt: now }, now)).toMatchObject({ state: { step: "email", error: RECOVERY_EXPIRED_ERROR } });
    expect(prepareRecoveryPassword({ ...state, password: "Strong!1", confirmPassword: "Strong!1" }, now)).toMatchObject({ value: "Strong!1", state: { error: "" } });
    expect(completeRecovery(now)).toMatchObject({ step: "email", email: "", resetToken: "" });
  });

  it("maps OTP failures, max attempts, rate limits, reset expiry, and retryable transport errors", () => {
    let state = createRecoveryState("otp", now);
    state = applyRecoveryError(state, "PASSWORD_RECOVERY_OTP_INVALID", undefined, now);
    expect(state).toMatchObject({ otpFailures: 1, otp: "", error: "Mã xác thực không đúng hoặc đã hết hạn." });
    state = { ...state, otpFailures: RECOVERY_MAX_OTP_ATTEMPTS - 1 };
    state = applyRecoveryError(state, "PASSWORD_RECOVERY_OTP_INVALID", undefined, now);
    expect(state).toMatchObject({ otpFailures: RECOVERY_MAX_OTP_ATTEMPTS, error: "Bạn đã nhập sai quá nhiều lần. Hãy gửi lại mã mới." });
    expect(applyRecoveryError(state, "PASSWORD_RECOVERY_OTP_INVALID", undefined, now).otpFailures).toBe(RECOVERY_MAX_OTP_ATTEMPTS);
    const limited = applyRecoveryError({ ...state, resendAvailableAt: 0 }, "AUTH_RATE_LIMITED", 17, now);
    expect(limited).toMatchObject({ resendAvailableAt: now + 17_000, retryAvailableAt: now + 17_000, error: "Bạn đã thao tác quá nhiều. Vui lòng thử lại sau." });
    expect(getRecoveryRetrySeconds(limited, now)).toBe(17);
    expect(getRecoveryRetrySeconds(limited, now + 17_000)).toBe(0);
    expect(applyRecoveryError({ ...state, resendAvailableAt: now + 90_000 }, "AUTH_RATE_LIMITED", undefined, now).resendAvailableAt).toBe(now + 90_000);
    expect(applyRecoveryError(state, "PASSWORD_RESET_TOKEN_INVALID", undefined, now)).toMatchObject({ step: "email", error: RECOVERY_EXPIRED_ERROR });
    expect(applyRecoveryError(state, "NETWORK_ERROR", undefined, now).error).toBe("Không thể kết nối máy chủ. Vui lòng thử lại.");
    expect(applyRecoveryError(state, "INVALID_SESSION", undefined, now).error).toBe("Không thể xử lý yêu cầu. Vui lòng thử lại.");
  });

  it("clears passwords on resume, expires stale credentials, and navigates back safely", () => {
    const passwordState = { ...createRecoveryState("password", now), password: "Strong!1", confirmPassword: "Strong!1", otp: "123456" };
    expect(resumeRecovery(passwordState, now)).toMatchObject({ step: "password", password: "", confirmPassword: "", resetToken: "review-reset-token" });
    expect(resumeRecovery({ ...passwordState, resetExpiresAt: now }, now)).toMatchObject({ step: "email", error: RECOVERY_EXPIRED_ERROR });
    expect(resumeRecovery({ ...createRecoveryState("otp", now), challengeExpiresAt: now }, now)).toMatchObject({ step: "email", error: RECOVERY_EXPIRED_ERROR });
    expect(resumeRecovery(createRecoveryState("email", now), now)).toMatchObject({ step: "email", password: "", confirmPassword: "" });
    expect(backRecovery(passwordState)).toMatchObject({ step: "email", email: "", resetToken: "", otp: "", resetExpiresAt: 0 });
    expect(backRecovery(createRecoveryState("otp", now))).toMatchObject({ step: "email", email: "", challengeId: "" });
  });
});
