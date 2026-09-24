import { env } from "@/config/env";
import { Platform } from "react-native";

export type GatewayErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_UNVERIFIED"
  | "ACCOUNT_INACTIVE"
  | "INVALID_OTP"
  | "OTP_EXPIRED"
  | "OTP_ATTEMPTS_EXHAUSTED"
  | "RESEND_COOLDOWN"
  | "RESEND_LIMIT"
  | "ACCOUNT_EXISTS"
  | "AUTH_RATE_LIMITED"
  | "OTP_PROVIDER_UNAVAILABLE"
  | "SIGNUP_UNAVAILABLE"
  | "PASSWORD_RECOVERY_OTP_INVALID"
  | "PASSWORD_RESET_TOKEN_INVALID"
  | "PASSWORD_CONFIRMATION_MISMATCH"
  | "PASSWORD_UNCHANGED"
  | "INVALID_SESSION"
  | "NETWORK_ERROR"
  | "SERVER_WAKING"
  | "SERVER_ERROR"
  | "CONFIGURATION_ERROR";

export class GatewayError extends Error {
  constructor(public readonly code: GatewayErrorCode, public readonly retryAfterSeconds?: number) { super(code); }
}

export type AuthSession = { accessToken: string; refreshToken: string };
export type OtpAttempt = { attemptId: string; expiresAt: number; resendAvailableAt: number };
export type RecoveryChallenge = { challengeId: string; expiresAt: number; resendAvailableAt: number };
export type RecoveryResetCredential = { resetToken: string; expiresAt: number };
export type RecoveryCompletion = { email: string; next: "sign_in" };

export interface AuthGateway {
  requestOtp(email: string): Promise<OtpAttempt>;
  resendOtp(email: string): Promise<OtpAttempt>;
  verifyOtp(email: string, attemptId: string, otp: string): Promise<void>;
  createAccount(email: string, attemptId: string, otp: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<AuthSession>;
  refresh(refreshToken: string): Promise<AuthSession>;
  me(accessToken: string): Promise<void>;
  logout(refreshToken: string): Promise<void>;
  requestPasswordRecovery(email: string): Promise<RecoveryChallenge>;
  verifyPasswordRecovery(email: string, challengeId: string, code: string): Promise<RecoveryResetCredential>;
  resetPassword(resetToken: string, newPassword: string, confirmPassword: string): Promise<RecoveryCompletion>;
}

type Fetch = typeof fetch;
type DiagnosticPhase = "device_id" | "fetch" | "parse";
type GatewayDiagnostic = { correlationId: string; elapsedMs: number; errorMessage?: string; errorName?: string; path: string; phase: DiagnosticPhase; platform: string; timedOut?: boolean };
type GatewayDependencies = {
  baseUrl: string;
  clearTimeout?: (timeout: ReturnType<typeof setTimeout>) => void;
  createCorrelationId?: () => string;
  deviceIdTimeoutMs?: number;
  diagnostic?: (event: GatewayDiagnostic) => void;
  fetch?: Fetch;
  getDeviceId: () => Promise<string>;
  now?: () => number;
  platform?: string;
  requestTimeoutMs?: number;
  setTimeout?: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
};
type ErrorPayload = { code?: string; details?: { retryAfterSeconds?: number }; error?: { code?: string }; message?: string };
type OtpResponse = { attemptId: string; expiresInSeconds: number; resendAfterSeconds?: number };
type TokenResponse = { accessToken: string; refreshToken: string };
type RecoveryChallengeResponse = { accepted: true; challengeId: string; expiresInSeconds: number; resendAfterSeconds: number };
type RecoveryVerificationResponse = { verified: true; resetToken: string; expiresInSeconds: number };
type RecoveryCompletionResponse = { reset: true; next: "sign_in"; email: string };

const knownCodes = new Set<GatewayErrorCode>([
  "INVALID_CREDENTIALS", "ACCOUNT_UNVERIFIED", "ACCOUNT_INACTIVE", "INVALID_OTP", "OTP_EXPIRED", "OTP_ATTEMPTS_EXHAUSTED", "RESEND_COOLDOWN", "RESEND_LIMIT", "ACCOUNT_EXISTS", "AUTH_RATE_LIMITED", "OTP_PROVIDER_UNAVAILABLE", "SIGNUP_UNAVAILABLE", "PASSWORD_RECOVERY_OTP_INVALID", "PASSWORD_RESET_TOKEN_INVALID", "PASSWORD_CONFIRMATION_MISMATCH", "PASSWORD_UNCHANGED", "INVALID_SESSION"
]);
// Legacy servers may omit the field; current API responses define it explicitly.
const DEFAULT_RESEND_AFTER_SECONDS = 60;
const DEFAULT_DEVICE_ID_TIMEOUT_MS = 5_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

function defaultCorrelationId(): string {
  return `auth-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeError(error: unknown): Pick<GatewayDiagnostic, "errorName" | "errorMessage"> {
  if (!error || typeof error !== "object") return {};
  const { name, message } = error as { name?: unknown; message?: unknown };
  return {
    ...(typeof name === "string" ? { errorName: name.slice(0, 80) } : {}),
    ...(typeof message === "string" ? { errorMessage: message.slice(0, 240) } : {})
  };
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number, setTimer: GatewayDependencies["setTimeout"], clearTimer: GatewayDependencies["clearTimeout"]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimer!(() => reject(new Error("timeout")), timeoutMs);
    operation.then(resolve, reject).finally(() => clearTimer!(timer));
  });
}

function gatewayError(status: number, payload: ErrorPayload | undefined): GatewayError {
  const code = payload?.code ?? payload?.error?.code;
  const mapped = code === "EMAIL_EXISTS"
    ? "ACCOUNT_EXISTS"
    : code && knownCodes.has(code as GatewayErrorCode)
      ? code as GatewayErrorCode
      : status === 429
        ? "AUTH_RATE_LIMITED"
        : status >= 500 ? "SERVER_ERROR" : "NETWORK_ERROR";
  const retryAfterSeconds = payload?.details?.retryAfterSeconds;
  return new GatewayError(mapped, Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined);
}

function asOtpAttempt(response: OtpResponse, now: () => number): OtpAttempt {
  if (!response.attemptId || !Number.isFinite(response.expiresInSeconds)) throw new GatewayError("SERVER_ERROR");
  const current = now();
  return {
    attemptId: response.attemptId,
    expiresAt: current + response.expiresInSeconds * 1000,
    resendAvailableAt: current + (response.resendAfterSeconds ?? DEFAULT_RESEND_AFTER_SECONDS) * 1000
  };
}

function asRecoveryChallenge(response: RecoveryChallengeResponse, now: () => number): RecoveryChallenge {
  if (response.accepted !== true || !response.challengeId || !Number.isFinite(response.expiresInSeconds) || !Number.isFinite(response.resendAfterSeconds)) throw new GatewayError("SERVER_ERROR");
  const current = now();
  return { challengeId: response.challengeId, expiresAt: current + response.expiresInSeconds * 1000, resendAvailableAt: current + response.resendAfterSeconds * 1000 };
}

function asRecoveryResetCredential(response: RecoveryVerificationResponse, now: () => number): RecoveryResetCredential {
  if (response.verified !== true || !response.resetToken || !Number.isFinite(response.expiresInSeconds)) throw new GatewayError("SERVER_ERROR");
  return { resetToken: response.resetToken, expiresAt: now() + response.expiresInSeconds * 1000 };
}

function asRecoveryCompletion(response: RecoveryCompletionResponse): RecoveryCompletion {
  if (response.reset !== true || response.next !== "sign_in" || !response.email) throw new GatewayError("SERVER_ERROR");
  return { email: response.email, next: response.next };
}

export function createApiAuthGateway({
  baseUrl,
  getDeviceId,
  fetch: fetchImpl = fetch,
  now = Date.now,
  createCorrelationId = defaultCorrelationId,
  diagnostic = (event) => console.warn("[auth-gateway]", JSON.stringify(event)),
  platform = Platform.OS,
  deviceIdTimeoutMs = DEFAULT_DEVICE_ID_TIMEOUT_MS,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  setTimeout: setTimer = setTimeout,
  clearTimeout: clearTimer = clearTimeout
}: GatewayDependencies): AuthGateway {
  const request = async <T>(path: string, init: RequestInit, accessToken?: string): Promise<T> => {
    const correlationId = createCorrelationId();
    const startedAt = now();
    const report = (phase: DiagnosticPhase, cause: unknown, timedOut = false) => diagnostic({ correlationId, elapsedMs: Math.max(0, now() - startedAt), path, phase, platform, timedOut, ...safeError(cause) });
    let deviceId: string;
    try {
      deviceId = await withTimeout(getDeviceId(), deviceIdTimeoutMs, setTimer, clearTimer);
    } catch (cause) {
      report("device_id", cause);
      throw new GatewayError("NETWORK_ERROR");
    }
    let response: Response;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimer(() => { timedOut = true; controller.abort(); }, requestTimeoutMs);
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-Correlation-Id": correlationId, "X-Device-Id": deviceId, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init.headers },
        signal: controller.signal
      });
    } catch (cause) {
      report("fetch", cause, timedOut);
      throw new GatewayError(timedOut ? "SERVER_WAKING" : "NETWORK_ERROR");
    } finally {
      clearTimer(timeout);
    }
    if (!response.ok) {
      let payload: ErrorPayload | undefined;
      try { payload = (await response.json()) as ErrorPayload; } catch { /* The HTTP status remains the fallback. */ }
      throw gatewayError(response.status, payload);
    }
    if (response.status === 204) return undefined as T;
    try { return (await response.json()) as T; } catch (cause) { report("parse", cause); throw new GatewayError("SERVER_ERROR"); }
  };
  const otpRequest = async (email: string) => asOtpAttempt(await request<OtpResponse>("/auth/signup/otp/request", { method: "POST", body: JSON.stringify({ email }) }), now);
  return {
    requestOtp: otpRequest,
    resendOtp: otpRequest,
    verifyOtp: async (email, attemptId, code) => { await request("/auth/signup/otp/verify", { method: "POST", body: JSON.stringify({ email, attemptId, code }) }); },
    createAccount: async (email, attemptId, code, password) => { await request("/auth/signup/complete", { method: "POST", body: JSON.stringify({ email, attemptId, code, password }) }); },
    signIn: (email, password) => request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    refresh: (refreshToken) => request<TokenResponse>("/auth/token/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }),
    me: async (accessToken) => { await request("/auth/me", { method: "GET" }, accessToken); },
    logout: async (refreshToken) => { await request("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }); },
    requestPasswordRecovery: async (email) => asRecoveryChallenge(await request<RecoveryChallengeResponse>("/auth/password/recovery/request", { method: "POST", body: JSON.stringify({ email }) }), now),
    verifyPasswordRecovery: async (email, challengeId, code) => asRecoveryResetCredential(await request<RecoveryVerificationResponse>("/auth/password/recovery/verify", { method: "POST", body: JSON.stringify({ email, challengeId, code }) }), now),
    resetPassword: async (resetToken, newPassword, confirmPassword) => asRecoveryCompletion(await request<RecoveryCompletionResponse>("/auth/password/recovery/reset", { method: "POST", body: JSON.stringify({ resetToken, newPassword, confirmPassword }) }))
  };
}

export function createConfiguredAuthGateway(getDeviceId: () => Promise<string>, apiBaseUrl = env.apiBaseUrl): AuthGateway {
  if (!apiBaseUrl) {
    const fail = async () => { throw new GatewayError("CONFIGURATION_ERROR"); };
    return { requestOtp: fail, resendOtp: fail, verifyOtp: fail, createAccount: fail, signIn: fail, refresh: fail, me: fail, logout: fail, requestPasswordRecovery: fail, verifyPasswordRecovery: fail, resetPassword: fail };
  }
  return createApiAuthGateway({ baseUrl: apiBaseUrl, getDeviceId });
}
