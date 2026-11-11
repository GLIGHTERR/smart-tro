import { env } from "@/config/env";

export type ChangePasswordErrorCode =
  | "INVALID_CURRENT_PASSWORD"
  | "INVALID_SESSION"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "UNAVAILABLE"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "CONFIGURATION_ERROR";

export class ChangePasswordGatewayError extends Error {
  constructor(public readonly code: ChangePasswordErrorCode) {
    super(code);
  }
}

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmation: string;
  idempotencyKey: string;
};

export interface ChangePasswordGateway {
  change(accessToken: string, input: ChangePasswordInput): Promise<void>;
}

type Dependencies = {
  baseUrl: string;
  fetch?: typeof fetch;
  requestTimeoutMs?: number;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
};

type ErrorPayload = { code?: unknown; error?: { code?: unknown } };
const DEFAULT_TIMEOUT_MS = 60_000;

function errorCode(status: number, body: unknown): ChangePasswordErrorCode {
  const code = body && typeof body === "object" ? ((body as ErrorPayload).error?.code ?? (body as ErrorPayload).code) : undefined;
  if (code === "INVALID_CREDENTIALS") return "INVALID_CURRENT_PASSWORD";
  if (status === 401 || code === "INVALID_SESSION") return "INVALID_SESSION";
  if (status === 429 || code === "AUTH_RATE_LIMITED") return "RATE_LIMITED";
  if (status === 409 || code === "PASSWORD_CHANGE_CONFLICT") return "CONFLICT";
  if (status === 400 || code === "PASSWORD_CONFIRMATION_MISMATCH" || code === "PASSWORD_UNCHANGED" || code === "IDEMPOTENCY_KEY_REQUIRED") return "VALIDATION_ERROR";
  return "UNAVAILABLE";
}

function isSuccess(value: unknown): value is { changed: true; next: "profile" } {
  return Boolean(value && typeof value === "object" && (value as { changed?: unknown }).changed === true && (value as { next?: unknown }).next === "profile");
}

export function createApiChangePasswordGateway({ baseUrl, fetch: fetchImpl = fetch, requestTimeoutMs = DEFAULT_TIMEOUT_MS, setTimeout: setTimer = setTimeout, clearTimeout: clearTimer = clearTimeout }: Dependencies): ChangePasswordGateway {
  return {
    async change(accessToken, input) {
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimer(() => { timedOut = true; controller.abort(); }, requestTimeoutMs);
      let response: Response;
      try {
        response = await fetchImpl(`${baseUrl}/auth/password/change`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Idempotency-Key": input.idempotencyKey
          },
          body: JSON.stringify({ currentPassword: input.currentPassword, newPassword: input.newPassword, confirmPassword: input.confirmation }),
          signal: controller.signal
        });
      } catch {
        throw new ChangePasswordGatewayError(timedOut ? "TIMEOUT" : "NETWORK_ERROR");
      } finally {
        clearTimer(timer);
      }

      let body: unknown;
      try { body = await response.json(); } catch { throw new ChangePasswordGatewayError(response.ok ? "UNAVAILABLE" : errorCode(response.status, undefined)); }
      if (!response.ok) throw new ChangePasswordGatewayError(errorCode(response.status, body));
      if (!isSuccess(body)) throw new ChangePasswordGatewayError("UNAVAILABLE");
    }
  };
}

export function createConfiguredChangePasswordGateway(apiBaseUrl = env.apiBaseUrl): ChangePasswordGateway {
  if (!apiBaseUrl) return { change: async () => { throw new ChangePasswordGatewayError("CONFIGURATION_ERROR"); } };
  return createApiChangePasswordGateway({ baseUrl: apiBaseUrl });
}
