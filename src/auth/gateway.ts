import { env } from "@/config/env";

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
  | "INVALID_SESSION"
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "CONFIGURATION_ERROR";

export class GatewayError extends Error {
  constructor(public readonly code: GatewayErrorCode) { super(code); }
}

export type AuthSession = { accessToken: string; refreshToken: string };
export type OtpAttempt = { attemptId: string; expiresAt: number; resendAvailableAt: number };

export interface AuthGateway {
  requestOtp(email: string): Promise<OtpAttempt>;
  resendOtp(email: string): Promise<OtpAttempt>;
  verifyOtp(email: string, attemptId: string, otp: string): Promise<void>;
  createAccount(email: string, attemptId: string, otp: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<AuthSession>;
  refresh(refreshToken: string): Promise<AuthSession>;
  me(accessToken: string): Promise<void>;
  logout(refreshToken: string): Promise<void>;
}

type Fetch = typeof fetch;
type GatewayDependencies = { baseUrl: string; getDeviceId: () => Promise<string>; fetch?: Fetch; now?: () => number };
type ErrorPayload = { code?: string; error?: { code?: string }; message?: string };
type OtpResponse = { attemptId: string; expiresInSeconds: number; resendAvailableInSeconds?: number };
type TokenResponse = { accessToken: string; refreshToken: string };

const knownCodes = new Set<GatewayErrorCode>([
  "INVALID_CREDENTIALS", "ACCOUNT_UNVERIFIED", "ACCOUNT_INACTIVE", "INVALID_OTP", "OTP_EXPIRED", "OTP_ATTEMPTS_EXHAUSTED", "RESEND_COOLDOWN", "RESEND_LIMIT", "ACCOUNT_EXISTS", "AUTH_RATE_LIMITED", "OTP_PROVIDER_UNAVAILABLE", "SIGNUP_UNAVAILABLE", "INVALID_SESSION"
]);

function errorCode(status: number, payload: ErrorPayload | undefined): GatewayErrorCode {
  const code = payload?.code ?? payload?.error?.code;
  if (code === "EMAIL_EXISTS") return "ACCOUNT_EXISTS";
  if (code && knownCodes.has(code as GatewayErrorCode)) return code as GatewayErrorCode;
  if (status === 429) return "AUTH_RATE_LIMITED";
  return status >= 500 ? "SERVER_ERROR" : "NETWORK_ERROR";
}

function asOtpAttempt(response: OtpResponse, now: () => number): OtpAttempt {
  if (!response.attemptId || !Number.isFinite(response.expiresInSeconds)) throw new GatewayError("SERVER_ERROR");
  const current = now();
  return {
    attemptId: response.attemptId,
    expiresAt: current + response.expiresInSeconds * 1000,
    resendAvailableAt: current + (response.resendAvailableInSeconds ?? 60) * 1000
  };
}

export function createApiAuthGateway({ baseUrl, getDeviceId, fetch: fetchImpl = fetch, now = Date.now }: GatewayDependencies): AuthGateway {
  const request = async <T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> => {
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-Device-Id": await getDeviceId(), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init.headers }
      });
    } catch {
      throw new GatewayError("NETWORK_ERROR");
    }
    if (!response.ok) {
      let payload: ErrorPayload | undefined;
      try { payload = (await response.json()) as ErrorPayload; } catch { /* The HTTP status remains the fallback. */ }
      throw new GatewayError(errorCode(response.status, payload));
    }
    if (response.status === 204) return undefined as T;
    try { return (await response.json()) as T; } catch { throw new GatewayError("SERVER_ERROR"); }
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
    logout: async (refreshToken) => { await request("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }); }
  };
}

export function createConfiguredAuthGateway(getDeviceId: () => Promise<string>, apiBaseUrl = env.apiBaseUrl): AuthGateway {
  if (!apiBaseUrl) {
    const fail = async () => { throw new GatewayError("CONFIGURATION_ERROR"); };
    return { requestOtp: fail, resendOtp: fail, verifyOtp: fail, createAccount: fail, signIn: fail, refresh: fail, me: fail, logout: fail };
  }
  return createApiAuthGateway({ baseUrl: apiBaseUrl, getDeviceId });
}
