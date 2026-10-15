import { env } from "@/config/env";

export type ProfileErrorCode = "INVALID_SESSION" | "PROFILE_INCOMPLETE" | "VALIDATION_ERROR" | "PROFILE_UNAVAILABLE" | "NETWORK_ERROR" | "TIMEOUT" | "CONFIGURATION_ERROR";
export class ProfileGatewayError extends Error { constructor(public readonly code: ProfileErrorCode) { super(code); } }

export type ProfilePayload = {
  profile: { displayName: string; email: string; phone: string | null; avatar: string | null };
  rentals: { contractId: string; room: string; property: string; propertyAddress: Record<string, unknown>; expiresAt: string; signedAt: string }[];
};
export type ProfileUpdate = Pick<ProfilePayload["profile"], "displayName" | "phone">;
export type ProfileUpdatePayload = { profile: ProfilePayload["profile"] };
export interface ProfileGateway { read(accessToken: string): Promise<ProfilePayload>; update(accessToken: string, input: ProfileUpdate): Promise<ProfileUpdatePayload>; }
type Dependencies = { baseUrl: string; fetch?: typeof fetch; requestTimeoutMs?: number; setTimeout?: typeof setTimeout; clearTimeout?: typeof clearTimeout; };
const DEFAULT_TIMEOUT_MS = 60_000;

function nonEmptyString(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
function isDateTime(value: unknown): value is string { return typeof value === "string" && !Number.isNaN(Date.parse(value)); }
function isProfilePayload(value: unknown): value is ProfilePayload {
  if (!value || typeof value !== "object") return false;
  const { profile, rentals } = value as Record<string, unknown>;
  if (!profile || typeof profile !== "object" || !Array.isArray(rentals)) return false;
  const subject = profile as Record<string, unknown>;
  return nonEmptyString(subject.displayName) && nonEmptyString(subject.email) && (subject.phone === null || typeof subject.phone === "string") && (subject.avatar === null || typeof subject.avatar === "string")
    && rentals.every((rental) => {
      if (!rental || typeof rental !== "object") return false;
      const item = rental as Record<string, unknown>;
      return nonEmptyString(item.contractId) && nonEmptyString(item.room) && nonEmptyString(item.property) && isDisplayableAddress(item.propertyAddress) && isDate(item.expiresAt) && isDateTime(item.signedAt);
    });
}
function isProfileUpdatePayload(value: unknown): value is ProfileUpdatePayload {
  if (!value || typeof value !== "object") return false;
  const { profile } = value as Record<string, unknown>;
  if (!profile || typeof profile !== "object") return false;
  const subject = profile as Record<string, unknown>;
  return nonEmptyString(subject.displayName) && nonEmptyString(subject.email) && (subject.phone === null || typeof subject.phone === "string") && subject.avatar === null;
}
function isDisplayableAddress(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.values(value as Record<string, unknown>).some((item) => nonEmptyString(item)));
}
function errorCode(status: number, body: unknown, updating: boolean): ProfileErrorCode {
  const code = body && typeof body === "object" ? (body as { error?: { code?: unknown } }).error?.code : undefined;
  if (status === 401 || code === "INVALID_SESSION") return "INVALID_SESSION";
  if (updating && status === 400) return "VALIDATION_ERROR";
  if (status === 409 || code === "PROFILE_INCOMPLETE") return "PROFILE_INCOMPLETE";
  return "PROFILE_UNAVAILABLE";
}

export function createApiProfileGateway({ baseUrl, fetch: fetchImpl = fetch, requestTimeoutMs = DEFAULT_TIMEOUT_MS, setTimeout: setTimer = setTimeout, clearTimeout: clearTimer = clearTimeout }: Dependencies): ProfileGateway {
  const request = async (accessToken: string, init: RequestInit, isUpdate = false): Promise<unknown> => {
    const controller = new AbortController(); let timedOut = false;
    const timer = setTimer(() => { timedOut = true; controller.abort(); }, requestTimeoutMs);
    let response: Response;
    try { response = await fetchImpl(`${baseUrl}/profile`, { ...init, headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}`, ...init.headers }, signal: controller.signal }); }
    catch { throw new ProfileGatewayError(timedOut ? "TIMEOUT" : "NETWORK_ERROR"); }
    finally { clearTimer(timer); }
    let body: unknown;
    try { body = await response.json(); } catch { throw new ProfileGatewayError("PROFILE_UNAVAILABLE"); }
    if (!response.ok) throw new ProfileGatewayError(errorCode(response.status, body, isUpdate));
    return body;
  };
  return { async read(accessToken) {
    const body = await request(accessToken, {});
    if (!isProfilePayload(body)) throw new ProfileGatewayError("PROFILE_UNAVAILABLE");
    return body;
  }, async update(accessToken, input) {
    const body = await request(accessToken, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: input.displayName, phone: input.phone }) }, true);
    if (!isProfileUpdatePayload(body)) throw new ProfileGatewayError("PROFILE_UNAVAILABLE");
    return body;
  } };
}
export function createConfiguredProfileGateway(apiBaseUrl = env.apiBaseUrl): ProfileGateway {
  return apiBaseUrl ? createApiProfileGateway({ baseUrl: apiBaseUrl }) : { read: async () => { throw new ProfileGatewayError("CONFIGURATION_ERROR"); }, update: async () => { throw new ProfileGatewayError("CONFIGURATION_ERROR"); } };
}
