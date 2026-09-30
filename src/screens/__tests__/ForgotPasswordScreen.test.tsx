import React from "react";
import { BackHandler, Pressable, StyleSheet, Text, TextInput } from "react-native";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";

import type { AuthGateway } from "../../auth/gateway";
import { ForgotPasswordScreen } from "../ForgotPasswordScreen";

jest.mock("@expo/vector-icons/FontAwesome", () => "FontAwesome");
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

function gateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    requestOtp: jest.fn(),
    resendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    createAccount: jest.fn(),
    signIn: jest.fn(),
    refresh: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
    requestPasswordRecovery: jest.fn(),
    verifyPasswordRecovery: jest.fn(),
    resetPassword: jest.fn(),
    ...overrides,
  } as AuthGateway;
}

function textOf(node: ReactTestInstance): string {
  return node.findAllByType(Text).map((text) => text.props.children).flat(Infinity).join("");
}

function button(root: ReactTestInstance, label: string): ReactTestInstance {
  return root.findAllByType(Pressable).find((pressable) => textOf(pressable) === label) as ReactTestInstance;
}

function resendButton(root: ReactTestInstance): ReactTestInstance {
  return root.findAllByType(Pressable).find((pressable) => textOf(pressable).startsWith("Gửi lại mã OTP")) as ReactTestInstance;
}

describe("ForgotPasswordScreen email change", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(BackHandler, "addEventListener").mockReturnValue({ remove: jest.fn() });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("renders the OTP destination before the input and keeps Continue before resend", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<ForgotPasswordScreen gateway={gateway()} initialStep="otp" onComplete={jest.fn()} onExit={jest.fn()} />);
    });

    const labels = renderer.root.findAllByType(Text).map((node) => node.props.children).flat(Infinity);
    expect(labels).toEqual(expect.arrayContaining(["Mã xác thực đã được gửi tới", "ma***@example.com", "Đổi email"]));
    expect(labels.indexOf("Mã xác thực đã được gửi tới")).toBeLessThan(labels.indexOf("Tiếp tục"));
    expect(labels.indexOf("Tiếp tục")).toBeLessThan(labels.findIndex((label) => typeof label === "string" && label.startsWith("Gửi lại mã OTP")));
    act(() => renderer.unmount());
  });

  it("uses a readable inverse resend button in both cooldown and enabled states", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<ForgotPasswordScreen gateway={gateway()} initialStep="otp" onComplete={jest.fn()} onExit={jest.fn()} />);
    });

    const coolingDown = resendButton(renderer.root);
    expect(coolingDown.props.disabled).toBe(true);
    expect(StyleSheet.flatten(coolingDown.props.style)).toMatchObject({ backgroundColor: "#C97900", borderColor: "#126DCC", borderWidth: 1.5, borderRadius: 9, height: 33 });
    expect(StyleSheet.flatten(coolingDown.findByType(Text).props.style)).toMatchObject({ color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold" });

    act(() => { jest.advanceTimersByTime(60_000); });
    const enabled = resendButton(renderer.root);
    expect(enabled.props.disabled).toBe(false);
    expect(StyleSheet.flatten(enabled.props.style)).toMatchObject({ backgroundColor: "#FF9A05", borderColor: "#1684F7", borderWidth: 1.5, borderRadius: 9, height: 33 });
    expect(StyleSheet.flatten(enabled.findByType(Text).props.style)).toMatchObject({ color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold" });
    act(() => renderer.unmount());
  });

  it("prefills and selects the prior email for both Change email and Android Back", () => {
    let hardwareBack!: () => boolean;
    jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, handler) => {
      hardwareBack = () => handler() === true;
      return { remove: jest.fn() };
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<ForgotPasswordScreen gateway={gateway()} initialStep="otp" onComplete={jest.fn()} onExit={jest.fn()} />);
    });

    act(() => button(renderer.root, "Đổi email").props.onPress());
    expect(renderer.root.findByType(TextInput).props).toMatchObject({ value: "mai@example.com", autoFocus: true, selectTextOnFocus: true });
    act(() => renderer.unmount());

    act(() => {
      renderer = TestRenderer.create(<ForgotPasswordScreen gateway={gateway()} initialStep="otp" onComplete={jest.fn()} onExit={jest.fn()} />);
    });
    act(() => { hardwareBack(); });
    expect(renderer.root.findByType(TextInput).props).toMatchObject({ value: "mai@example.com", autoFocus: true, selectTextOnFocus: true });
    act(() => renderer.unmount());
  });

  it("ignores a stale OTP verification and resends only for the replacement email", async () => {
    const oldVerification = deferred<{ resetToken: string; expiresAt: number }>();
    const requestPasswordRecovery = jest.fn()
      .mockResolvedValueOnce({ challengeId: "new-1", expiresAt: Date.now() + 600_000, resendAvailableAt: 0 })
      .mockResolvedValueOnce({ challengeId: "new-2", expiresAt: Date.now() + 600_000, resendAvailableAt: Date.now() + 60_000 });
    const auth = gateway({
      requestPasswordRecovery,
      verifyPasswordRecovery: jest.fn(() => oldVerification.promise),
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<ForgotPasswordScreen gateway={auth} initialStep="otp" onComplete={jest.fn()} onExit={jest.fn()} />);
    });

    act(() => renderer.root.findByType(TextInput).props.onChangeText("123456"));
    act(() => button(renderer.root, "Tiếp tục").props.onPress());
    act(() => button(renderer.root, "Đổi email").props.onPress());
    act(() => renderer.root.findByType(TextInput).props.onChangeText("new@example.com"));
    act(() => button(renderer.root, "Gửi OTP").props.onPress());
    await act(async () => { await Promise.resolve(); });

    expect(requestPasswordRecovery).toHaveBeenNthCalledWith(1, "new@example.com");
    act(() => button(renderer.root, "Gửi lại mã OTP").props.onPress());
    await act(async () => { await Promise.resolve(); });
    expect(requestPasswordRecovery).toHaveBeenNthCalledWith(2, "new@example.com");

    await act(async () => oldVerification.resolve({ resetToken: "stale-token", expiresAt: Date.now() + 600_000 }));
    expect(renderer.root.findByProps({ accessibilityLabel: "Mã OTP" })).toBeTruthy();
    expect(renderer.root.findAllByProps({ accessibilityLabel: "Mật khẩu" })).toHaveLength(0);
    act(() => renderer.unmount());
  });
});
