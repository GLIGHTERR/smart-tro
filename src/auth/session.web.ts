export type Session = { accessToken: string; refreshToken: string };

// The review website must not persist credentials or tokens in browser storage.
// AuthProvider can still hold a session in React state for the current page only.
export const sessionStore = {
  get: async (): Promise<Session | null> => null,
  set: async (_session: Session): Promise<void> => undefined,
  clear: async (): Promise<void> => undefined
};
