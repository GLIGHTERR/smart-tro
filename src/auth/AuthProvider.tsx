import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getDeviceId } from "./device";
import { createConfiguredAuthGateway, type AuthSession } from "./gateway";
import { sessionStore } from "./session";

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
      const session = await sessionStore.get();
      if (!session) return;
      try {
        const gateway = createConfiguredAuthGateway(getDeviceId);
        const rotated = await gateway.refresh(session.refreshToken);
        await gateway.me(rotated.accessToken);
        await sessionStore.set(rotated);
        setToken(rotated.accessToken);
      } catch { await sessionStore.clear(); }
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
