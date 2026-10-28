import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getDeviceId } from "./device";
import { createConfiguredAuthGateway, type AuthSession } from "./gateway";
import { sessionStore } from "./session";
import { restoreStoredSession } from "./restoreSession";

type AuthContextValue = {
  token: string | null;
  isRestoring: boolean;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    const restore = async () => {
      const session = await restoreStoredSession({ gateway: createConfiguredAuthGateway(getDeviceId), store: sessionStore });
      if (session) setToken(session.accessToken);
    };
    restore().finally(() => setIsRestoring(false));
  }, []);

  const signIn = useCallback(async (session: AuthSession) => {
    await sessionStore.set(session);
    setToken(session.accessToken);
  }, []);
  const signOut = useCallback(async () => {
    const session = await sessionStore.get();
    try { if (session) await createConfiguredAuthGateway(getDeviceId).logout(session.refreshToken); }
    finally { await sessionStore.clear(); setToken(null); }
  }, []);
  const value = useMemo(() => ({ token, isRestoring, signIn, signOut }), [token, isRestoring, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
