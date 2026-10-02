import type { AuthGateway, AuthSession } from "./gateway";
import type { Session } from "./session";

export const SESSION_RESTORE_OPERATION_TIMEOUT_MS = 8_000;
export const SESSION_RESTORE_TIMEOUT_MS = 20_000;

export type SessionStore = {
  get: () => Promise<Session | null>;
  set: (session: Session) => Promise<void>;
  clear: () => Promise<void>;
};

type RestoreDependencies = {
  gateway: AuthGateway;
  operationTimeoutMs?: number;
  restoreTimeoutMs?: number;
  store: SessionStore;
};

function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("startup-timeout")), timeoutMs);
    operation.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

function isSession(value: Session | AuthSession): value is Session {
  return typeof value.accessToken === "string" && value.accessToken.length > 0
    && typeof value.refreshToken === "string" && value.refreshToken.length > 0;
}

// A stored credential is never trusted until refresh and /me both succeed.
export async function restoreStoredSession({
  gateway,
  operationTimeoutMs = SESSION_RESTORE_OPERATION_TIMEOUT_MS,
  restoreTimeoutMs = SESSION_RESTORE_TIMEOUT_MS,
  store
}: RestoreDependencies): Promise<Session | null> {
  const clearInvalidSession = async () => {
    try { await withTimeout(store.clear(), operationTimeoutMs); } catch { /* Startup still has to reach Sign In. */ }
  };
  const restore = async (): Promise<Session | null> => {
    try {
      const stored = await withTimeout(store.get(), operationTimeoutMs);
      if (!stored) return null;
      if (!isSession(stored)) throw new Error("invalid-session");
      const rotated = await withTimeout(gateway.refresh(stored.refreshToken), operationTimeoutMs);
      if (!isSession(rotated)) throw new Error("invalid-session");
      await withTimeout(gateway.me(rotated.accessToken), operationTimeoutMs);
      await withTimeout(store.set(rotated), operationTimeoutMs);
      return rotated;
    } catch {
      await clearInvalidSession();
      return null;
    }
  };

  try { return await withTimeout(restore(), restoreTimeoutMs); }
  catch { await clearInvalidSession(); return null; }
}
