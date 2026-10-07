import { env } from "@/config/env";

export type ProfileErrorCode = "INVALID_SESSION" | "PROFILE_INCOMPLETE" | "PROFILE_UNAVAILABLE" | "NETWORK_ERROR" | "TIMEOUT" | "CONFIGURATION_ERROR";
export class ProfileGatewayError extends Error { constructor(public readonly code: ProfileErrorCode) { super(code); } }

export type ProfilePayload = {
  profile: { displayName: string; email: string; phone: string | null; avatar: string | null };
  rentals: { contractId: string; room: string; property: string; propertyAddress: Record<string, unknown>; expiresAt: string; signedAt: string }[];
};
export interface ProfileGateway { read(accessToken: string): Promise<ProfilePayload>; }
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
function isDisplayableAddress(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.values(value as Record<string, unknown>).some((item) => nonEmptyString(item)));
}
function errorCode(status: number, body: unknown): ProfileErrorCode {
  const code = body && typeof body === "object" ? (body as { error?: { code?: unknown } }).error?.code : undefined;
  if (status === 401 || code === "INVALID_SESSION") return "INVALID_SESSION";
  if (status === 409 || code === "PROFILE_INCOMPLETE") return "PROFILE_INCOMPLETE";
  return "PROFILE_UNAVAILABLE";
}

export function createApiProfileGateway({ baseUrl, fetch: fetchImpl = fetch, requestTimeoutMs = DEFAULT_TIMEOUT_MS, setTimeout: setTimer = setTimeout, clearTimeout: clearTimer = clearTimeout }: Dependencies): ProfileGateway {
  return { async read(accessToken) {
    const controller = new AbortController(); let timedOut = false;
    const timer = setTimer(() => { timedOut = true; controller.abort(); }, requestTimeoutMs);
    let response: Response;
    try { response = await fetchImpl(`${baseUrl}/profile`, { headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` }, signal: controller.signal }); }
    catch { throw new ProfileGatewayError(timedOut ? "TIMEOUT" : "NETWORK_ERROR"); }
    finally { clearTimer(timer); }
    let body: unknown;
    try { body = await response.json(); } catch { throw new ProfileGatewayError("PROFILE_UNAVAILABLE"); }
    if (!response.ok) throw new ProfileGatewayError(errorCode(response.status, body));
    if (!isProfilePayload(body)) throw new ProfileGatewayError("PROFILE_UNAVAILABLE");
    return body;
  } };
}
export function createConfiguredProfileGateway(apiBaseUrl = env.apiBaseUrl): ProfileGateway {
  return apiBaseUrl ? createApiProfileGateway({ baseUrl: apiBaseUrl }) : { read: async () => { throw new ProfileGatewayError("CONFIGURATION_ERROR"); } };
}
