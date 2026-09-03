import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { sessionStore } from "./session";

type AuthContextValue = {
  token: string | null;
  isRestoring: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    sessionStore.get().then((session) => setToken(session?.accessToken ?? null)).finally(() => setIsRestoring(false));
  }, []);

  const signIn = useCallback(async (accessToken: string) => {
    await sessionStore.set({ accessToken });
    setToken(accessToken);
  }, []);
  const signOut = useCallback(async () => {
    await sessionStore.clear();
    setToken(null);
  }, []);
  const value = useMemo(() => ({ token, isRestoring, signIn, signOut }), [token, isRestoring, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
