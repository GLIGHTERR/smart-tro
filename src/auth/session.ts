import * as SecureStore from "expo-secure-store";

const sessionKey = "smarttro.session";
export type Session = { accessToken: string; refreshToken: string };

export const sessionStore = {
  async get(): Promise<Session | null> {
    const value = await SecureStore.getItemAsync(sessionKey);
    if (!value) return null;
    const session = JSON.parse(value) as Partial<Session>;
    if (typeof session.accessToken !== "string" || !session.accessToken || typeof session.refreshToken !== "string" || !session.refreshToken) throw new Error("invalid-session");
    return { accessToken: session.accessToken, refreshToken: session.refreshToken };
  },
  set: (session: Session) => SecureStore.setItemAsync(sessionKey, JSON.stringify(session)),
  clear: () => SecureStore.deleteItemAsync(sessionKey)
};
