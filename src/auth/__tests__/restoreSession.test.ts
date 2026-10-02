import { restoreStoredSession } from "../restoreSession";
import type { AuthGateway, AuthSession } from "../gateway";
import type { SessionStore } from "../restoreSession";

const stored = { accessToken: "stored-access", refreshToken: "stored-refresh" };
const rotated = { accessToken: "rotated-access", refreshToken: "rotated-refresh" };
const never = <T,>() => new Promise<T>(() => undefined);

function gateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    requestOtp: jest.fn(), resendOtp: jest.fn(), verifyOtp: jest.fn(), createAccount: jest.fn(), signIn: jest.fn(), logout: jest.fn(), requestPasswordRecovery: jest.fn(), verifyPasswordRecovery: jest.fn(), resetPassword: jest.fn(),
    refresh: jest.fn(async (): Promise<AuthSession> => rotated), me: jest.fn(async () => undefined), ...overrides
  };
}

function store(overrides: Partial<SessionStore> = {}): SessionStore {
  return { get: jest.fn(async () => stored), set: jest.fn(async () => undefined), clear: jest.fn(async () => undefined), ...overrides };
}

describe("restoreStoredSession", () => {
  it("restores, verifies, rotates, and persists a valid session", async () => {
    const auth = gateway(); const sessions = store();
    await expect(restoreStoredSession({ gateway: auth, store: sessions })).resolves.toEqual(rotated);
    expect(auth.refresh).toHaveBeenCalledWith(stored.refreshToken); expect(auth.me).toHaveBeenCalledWith(rotated.accessToken); expect(sessions.set).toHaveBeenCalledWith(rotated); expect(sessions.clear).not.toHaveBeenCalled();
  });

  it("finishes at Sign In when there is no session", async () => {
    const auth = gateway(); const sessions = store({ get: jest.fn(async () => null) });
    await expect(restoreStoredSession({ gateway: auth, store: sessions })).resolves.toBeNull();
    expect(auth.refresh).not.toHaveBeenCalled(); expect(sessions.clear).not.toHaveBeenCalled();
  });

  it.each([
    ["malformed persisted value", store({ get: jest.fn(async () => ({ accessToken: "", refreshToken: "" })) })],
    ["unreadable SecureStore", store({ get: jest.fn(async () => { throw new Error("storage"); }) })],
    ["stale refresh token", store(), gateway({ refresh: jest.fn(async () => { throw new Error("stale"); }) })],
    ["/me rejection", store(), gateway({ me: jest.fn(async () => { throw new Error("invalid"); }) })],
    ["rotated persistence rejection", store({ set: jest.fn(async () => { throw new Error("storage"); }) })]
  ] as const)("clears credentials and finishes at Sign In after %s", async (_label, sessions, auth = gateway()) => {
    await expect(restoreStoredSession({ gateway: auth, store: sessions })).resolves.toBeNull();
    expect(sessions.clear).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["missing stored refresh token", store({ get: jest.fn(async () => ({ accessToken: "stored-access", refreshToken: "" })) }), gateway()],
    ["missing rotated access token", store(), gateway({ refresh: jest.fn(async () => ({ accessToken: "", refreshToken: "rotated-refresh" })) })],
    ["missing rotated refresh token", store(), gateway({ refresh: jest.fn(async () => ({ accessToken: "rotated-access", refreshToken: "" })) })]
  ] as const)("clears credentials and finishes at Sign In with %s", async (_label, sessions, auth) => {
    await expect(restoreStoredSession({ gateway: auth, store: sessions })).resolves.toBeNull();
    expect(sessions.clear).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["SecureStore read", store({ get: jest.fn(() => never()) }), gateway()],
    ["refresh", store(), gateway({ refresh: jest.fn(() => never()) })],
    ["/me", store(), gateway({ me: jest.fn(() => never()) })]
  ] as const)("times out %s and finishes at Sign In", async (_label, sessions, auth) => {
    await expect(restoreStoredSession({ gateway: auth, store: sessions, operationTimeoutMs: 1, restoreTimeoutMs: 2 })).resolves.toBeNull();
    expect(sessions.clear).toHaveBeenCalledTimes(1);
  });

  it("finishes at Sign In when the full restore deadline expires before a read", async () => {
    const sessions = store({ get: jest.fn(() => never()) });
    await expect(restoreStoredSession({ gateway: gateway(), store: sessions, operationTimeoutMs: 20, restoreTimeoutMs: 1 })).resolves.toBeNull();
    expect(sessions.clear).toHaveBeenCalledTimes(1);
  });

  it("still reaches Sign In when credential clearing times out", async () => {
    const sessions = store({ get: jest.fn(async () => { throw new Error("storage"); }), clear: jest.fn(() => never()) });
    await expect(restoreStoredSession({ gateway: gateway(), store: sessions, operationTimeoutMs: 1 })).resolves.toBeNull();
    expect(sessions.clear).toHaveBeenCalledTimes(1);
  });

  it("does not let an unreadable restored session create a retry loop", async () => {
    const sessions = store({ get: jest.fn(async () => { throw new Error("restored-state"); }) });
    await expect(restoreStoredSession({ gateway: gateway(), store: sessions })).resolves.toBeNull();
    expect(sessions.get).toHaveBeenCalledTimes(1); expect(sessions.clear).toHaveBeenCalledTimes(1);
  });
});
