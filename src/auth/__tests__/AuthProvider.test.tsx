import React from "react";
import { Pressable, Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import { AuthProvider, useAuth } from "../AuthProvider";
import { createConfiguredAuthGateway } from "../gateway";
import { sessionStore } from "../session";

jest.mock("../device", () => ({ getDeviceId: jest.fn() }));
jest.mock("../gateway", () => ({ createConfiguredAuthGateway: jest.fn() }));
jest.mock("../restoreSession", () => ({ restoreStoredSession: jest.fn().mockResolvedValue(null) }));
jest.mock("../session", () => ({ sessionStore: { clear: jest.fn(), get: jest.fn(), set: jest.fn() } }));

function SignOutControl() {
  const { isRestoring, signOut } = useAuth();
  return <Pressable accessibilityLabel="logout control" onPress={() => { void signOut().catch(() => undefined); }}><Text>{isRestoring ? "restoring" : "ready"}</Text></Pressable>;
}

describe("AuthProvider", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("clears the local session even when remote logout is unavailable", async () => {
    const logout = jest.fn().mockRejectedValue(new Error("offline"));
    (createConfiguredAuthGateway as jest.Mock).mockReturnValue({ logout });
    (sessionStore.get as jest.Mock).mockResolvedValue({ accessToken: "access-token", refreshToken: "refresh-token" });
    (sessionStore.clear as jest.Mock).mockResolvedValue(undefined);
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => { renderer = TestRenderer.create(<AuthProvider><SignOutControl /></AuthProvider>); });
    await act(async () => { renderer.root.findByProps({ accessibilityLabel: "logout control" }).props.onPress(); await Promise.resolve(); });

    expect(logout).toHaveBeenCalledWith("refresh-token");
    expect(sessionStore.clear).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });
});
