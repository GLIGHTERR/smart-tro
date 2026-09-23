import { normalizeEmail, validateEmail, validatePassword } from "./validation";

export const RECOVERY_CREDENTIAL_TTL_MS = 10 * 60 * 1000;
export const RECOVERY_RESEND_COOLDOWN_MS = 60 * 1000;
export const RECOVERY_GENERIC_NOTICE = "Nếu email tồn tại, mã xác thực đã được gửi.";
export const RECOVERY_EXPIRED_ERROR = "Phiên khôi phục đã hết hạn. Vui lòng bắt đầu lại.";

export type RecoveryStep = "email" | "otp" | "password";

export type RecoveryState = {
  step: RecoveryStep;
  email: string;
  otp: string;
  password: string;
  confirmPassword: string;
  challengeExpiresAt: number;
  resetExpiresAt: number;
  resendAvailableAt: number;
  notice: string;
  error: string;
};

export function createRecoveryState(step: RecoveryStep = "email", now = Date.now()): RecoveryState {
  const hasChallenge = step !== "email";
  return {
    step,
    email: hasChallenge ? "mai@example.com" : "",
    otp: "",
    password: "",
    confirmPassword: "",
    challengeExpiresAt: hasChallenge ? now + RECOVERY_CREDENTIAL_TTL_MS : 0,
    resetExpiresAt: step === "password" ? now + RECOVERY_CREDENTIAL_TTL_MS : 0,
    resendAvailableAt: step === "otp" ? now + RECOVERY_RESEND_COOLDOWN_MS : 0,
    notice: step === "otp" ? RECOVERY_GENERIC_NOTICE : "",
    error: "",
  };
}

export function submitRecoveryEmail(state: RecoveryState, now: number): RecoveryState {
  const invalid = validateEmail(state.email);
  if (invalid) return { ...state, error: invalid, notice: "" };
  return {
    ...state,
    step: "otp",
    email: normalizeEmail(state.email),
    otp: "",
    challengeExpiresAt: now + RECOVERY_CREDENTIAL_TTL_MS,
    resetExpiresAt: 0,
    resendAvailableAt: now + RECOVERY_RESEND_COOLDOWN_MS,
    notice: RECOVERY_GENERIC_NOTICE,
    error: "",
  };
}

export function sanitizeRecoveryOtp(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function submitRecoveryOtp(state: RecoveryState, now: number): RecoveryState {
  if (state.challengeExpiresAt <= now) return expiredRecoveryState();
  if (!/^\d{6}$/.test(state.otp)) return { ...state, error: "Nhập đủ 6 chữ số." };
  return {
    ...state,
    step: "password",
    password: "",
    confirmPassword: "",
    resetExpiresAt: now + RECOVERY_CREDENTIAL_TTL_MS,
    notice: "",
    error: "",
  };
}

export function resendRecoveryOtp(state: RecoveryState, now: number): RecoveryState {
  if (now < state.resendAvailableAt) return state;
  return {
    ...state,
    otp: "",
    challengeExpiresAt: now + RECOVERY_CREDENTIAL_TTL_MS,
    resendAvailableAt: now + RECOVERY_RESEND_COOLDOWN_MS,
    notice: RECOVERY_GENERIC_NOTICE,
    error: "",
  };
}

export function submitRecoveryPassword(state: RecoveryState, now: number): { state: RecoveryState; completedEmail?: string } {
  if (state.resetExpiresAt <= now) return { state: expiredRecoveryState() };
  const invalid = validatePassword(state.password);
  if (invalid) return { state: { ...state, error: invalid } };
  if (state.password !== state.confirmPassword) return { state: { ...state, error: "Xác nhận mật khẩu chưa khớp." } };
  return { state: createRecoveryState("email", now), completedEmail: state.email };
}

export function resumeRecovery(state: RecoveryState, now: number): RecoveryState {
  if (state.step === "otp" && state.challengeExpiresAt <= now) return expiredRecoveryState();
  if (state.step === "password" && state.resetExpiresAt <= now) return expiredRecoveryState();
  return { ...state, password: "", confirmPassword: "" };
}

export function backRecovery(state: RecoveryState): RecoveryState {
  if (state.step === "password") {
    return { ...state, step: "otp", password: "", confirmPassword: "", resetExpiresAt: 0, error: "", notice: RECOVERY_GENERIC_NOTICE };
  }
  return createRecoveryState();
}

export function getResendSeconds(state: RecoveryState, now: number): number {
  return Math.max(0, Math.ceil((state.resendAvailableAt - now) / 1000));
}

function expiredRecoveryState(): RecoveryState {
  return { ...createRecoveryState(), error: RECOVERY_EXPIRED_ERROR };
}
