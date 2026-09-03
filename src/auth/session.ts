import * as SecureStore from "expo-secure-store";

const sessionKey = "smarttro.session";
export type Session = { accessToken: string };

export const sessionStore = {
  async get(): Promise<Session | null> {
    const value = await SecureStore.getItemAsync(sessionKey);
    return value ? (JSON.parse(value) as Session) : null;
  },
  set: (session: Session) => SecureStore.setItemAsync(sessionKey, JSON.stringify(session)),
  clear: () => SecureStore.deleteItemAsync(sessionKey)
};
