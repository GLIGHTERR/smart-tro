import type { GatewayErrorCode, RecoveryChallenge, RecoveryResetCredential } from "./gateway";
import { normalizeEmail, validateEmail, validatePassword } from "./validation";

export const RECOVERY_CREDENTIAL_TTL_MS = 10 * 60 * 1000;
export const RECOVERY_RESEND_COOLDOWN_MS = 60 * 1000;
export const RECOVERY_MAX_OTP_ATTEMPTS = 5;
export const RECOVERY_GENERIC_NOTICE = "Nếu email tồn tại, mã xác thực đã được gửi.";
export const RECOVERY_EXPIRED_ERROR = "Phiên khôi phục đã hết hạn. Vui lòng bắt đầu lại.";

export type RecoveryStep = "email" | "otp" | "password";

export type RecoveryState = {
  step: RecoveryStep;
  email: string;
  challengeId: string;
  resetToken: string;
  otp: string;
  password: string;
  confirmPassword: string;
  otpFailures: number;
  challengeExpiresAt: number;
  resetExpiresAt: number;
  resendAvailableAt: number;
  retryAvailableAt: number;
  notice: string;
  error: string;
};

export type RecoverySubmission =
  | { state: RecoveryState }
  | { state: RecoveryState; value: string };

export function createRecoverySubmissionGuard() {
  let pending = false;
  return {
    async run(operation: () => Promise<void>): Promise<boolean> {
      if (pending) return false;
      pending = true;
      try { await operation(); return true; }
      finally { pending = false; }
    },
  };
}

export function createRecoveryState(step: RecoveryStep = "email", now = Date.now()): RecoveryState {
  const hasChallenge = step !== "email";
  return {
    step,
    email: hasChallenge ? "mai@example.com" : "",
    challengeId: hasChallenge ? "review-challenge" : "",
    resetToken: step === "password" ? "review-reset-token" : "",
    otp: "",
    password: "",
    confirmPassword: "",
    otpFailures: 0,
    challengeExpiresAt: hasChallenge ? now + RECOVERY_CREDENTIAL_TTL_MS : 0,
    resetExpiresAt: step === "password" ? now + RECOVERY_CREDENTIAL_TTL_MS : 0,
    resendAvailableAt: step === "otp" ? now + RECOVERY_RESEND_COOLDOWN_MS : 0,
    retryAvailableAt: 0,
    notice: step === "otp" ? RECOVERY_GENERIC_NOTICE : "",
    error: "",
  };
}

export function prepareRecoveryEmail(state: RecoveryState): RecoverySubmission {
  const invalid = validateEmail(state.email);
  if (invalid) return { state: { ...state, error: invalid, notice: "" } };
  return { state: { ...state, error: "" }, value: normalizeEmail(state.email) };
}

export function acceptRecoveryChallenge(state: RecoveryState, email: string, challenge: RecoveryChallenge): RecoveryState {
  return {
    ...state,
    step: "otp",
    email,
    challengeId: challenge.challengeId,
    resetToken: "",
    otp: "",
    password: "",
    confirmPassword: "",
    otpFailures: 0,
    challengeExpiresAt: challenge.expiresAt,
    resetExpiresAt: 0,
    resendAvailableAt: challenge.resendAvailableAt,
    retryAvailableAt: 0,
    notice: RECOVERY_GENERIC_NOTICE,
    error: "",
  };
}

export function sanitizeRecoveryOtp(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function prepareRecoveryOtp(state: RecoveryState, now: number): RecoverySubmission {
  if (state.challengeExpiresAt <= now) return { state: expiredRecoveryState() };
  if (!/^\d{6}$/.test(state.otp)) return { state: { ...state, error: "Nhập đủ 6 chữ số." } };
  return { state: { ...state, error: "" }, value: state.otp };
}

export function acceptRecoveryVerification(state: RecoveryState, credential: RecoveryResetCredential): RecoveryState {
  return {
    ...state,
    step: "password",
    resetToken: credential.resetToken,
    otp: "",
    password: "",
    confirmPassword: "",
    resetExpiresAt: credential.expiresAt,
    retryAvailableAt: 0,
    notice: "",
    error: "",
  };
}

export function canResendRecoveryOtp(state: RecoveryState, now: number): boolean {
  return state.step === "otp" && now >= state.resendAvailableAt;
}

export function prepareRecoveryPassword(state: RecoveryState, now: number): RecoverySubmission {
  if (state.resetExpiresAt <= now) return { state: expiredRecoveryState() };
  const invalid = validatePassword(state.password);
  if (invalid) return { state: { ...state, error: invalid } };
  if (state.password !== state.confirmPassword) return { state: { ...state, error: "Xác nhận mật khẩu chưa khớp." } };
  return { state: { ...state, error: "" }, value: state.password };
}

export function applyRecoveryError(state: RecoveryState, code: GatewayErrorCode, retryAfterSeconds: number | undefined, now: number): RecoveryState {
  if (code === "PASSWORD_RESET_TOKEN_INVALID") return expiredRecoveryState();
  if (code === "PASSWORD_RECOVERY_OTP_INVALID") {
    const otpFailures = Math.min(RECOVERY_MAX_OTP_ATTEMPTS, state.otpFailures + 1);
    return {
      ...state,
      otp: "",
      otpFailures,
      error: otpFailures >= RECOVERY_MAX_OTP_ATTEMPTS
        ? "Bạn đã nhập sai quá nhiều lần. Hãy gửi lại mã mới."
        : "Mã xác thực không đúng hoặc đã hết hạn.",
    };
  }
  if (code === "AUTH_RATE_LIMITED") {
    const retryMs = Math.max(1, retryAfterSeconds ?? 60) * 1000;
    const retryAvailableAt = now + retryMs;
    return { ...state, resendAvailableAt: Math.max(state.resendAvailableAt, retryAvailableAt), retryAvailableAt, error: "Bạn đã thao tác quá nhiều. Vui lòng thử lại sau." };
  }
  const messages: Partial<Record<GatewayErrorCode, string>> = {
    NETWORK_ERROR: "Không thể kết nối máy chủ. Vui lòng thử lại.",
    SERVER_WAKING: "Máy chủ đang khởi động. Vui lòng thử lại sau ít phút.",
    SERVER_ERROR: "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.",
    CONFIGURATION_ERROR: "Ứng dụng chưa được cấu hình kết nối máy chủ.",
    PASSWORD_UNCHANGED: "Mật khẩu mới phải khác mật khẩu hiện tại.",
    PASSWORD_CONFIRMATION_MISMATCH: "Xác nhận mật khẩu chưa khớp.",
  };
  return { ...state, error: messages[code] ?? "Không thể xử lý yêu cầu. Vui lòng thử lại." };
}

export function completeRecovery(now: number): RecoveryState {
  return createRecoveryState("email", now);
}

export function resumeRecovery(state: RecoveryState, now: number): RecoveryState {
  if (state.step === "otp" && state.challengeExpiresAt <= now) return expiredRecoveryState();
  if (state.step === "password" && state.resetExpiresAt <= now) return expiredRecoveryState();
  return { ...state, password: "", confirmPassword: "" };
}

export function backRecovery(_state: RecoveryState): RecoveryState {
  // Verification consumes the challenge, so any backward navigation restarts recovery.
  return createRecoveryState();
}

export function getResendSeconds(state: RecoveryState, now: number): number {
  return Math.max(0, Math.ceil((state.resendAvailableAt - now) / 1000));
}

export function getRecoveryRetrySeconds(state: RecoveryState, now: number): number {
  return Math.max(0, Math.ceil((state.retryAvailableAt - now) / 1000));
}

function expiredRecoveryState(): RecoveryState {
  return { ...createRecoveryState(), error: RECOVERY_EXPIRED_ERROR };
}
