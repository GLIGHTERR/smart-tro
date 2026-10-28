import { sessionStore } from "../session.web";

describe("web session store", () => {
  it("never restores or persists a preview session", async () => {
    await expect(sessionStore.get()).resolves.toBeNull();
    await expect(sessionStore.set({ accessToken: "preview-access-token", refreshToken: "preview-refresh-token" })).resolves.toBeUndefined();
    await expect(sessionStore.get()).resolves.toBeNull();
    await expect(sessionStore.clear()).resolves.toBeUndefined();
  });
});
