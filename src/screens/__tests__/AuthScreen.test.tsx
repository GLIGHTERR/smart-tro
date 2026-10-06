import React from "react";
import { Pressable, Text } from "react-native";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";

import type { AuthGateway } from "../../auth/gateway";
import { AuthScreen } from "../AuthScreen";

jest.mock("@expo/vector-icons/FontAwesome", () => "FontAwesome");
jest.mock("@expo-google-fonts/be-vietnam-pro/useFonts", () => ({ useFonts: () => [true, null] }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
jest.mock("@/auth/AuthProvider", () => ({ useAuth: () => ({ signIn: jest.fn() }) }));
jest.mock("@/auth/recoveryReview", () => ({ getRecoveryReviewStep: () => null }));

function textOf(node: ReactTestInstance): string {
  return node.findAllByType(Text).map((text) => text.props.children).flat(Infinity).join("");
}

function button(root: ReactTestInstance, label: string): ReactTestInstance {
  return root.findAllByType(Pressable).find((pressable) => textOf(pressable) === label) as ReactTestInstance;
}

function input(root: ReactTestInstance, label: string): ReactTestInstance {
  return root.findByProps({ accessibilityLabel: label }) as ReactTestInstance;
}

function gateway(): AuthGateway {
  return {
    requestOtp: jest.fn().mockResolvedValue({ attemptId: "attempt-1", expiresAt: 601_000, resendAvailableAt: 0 }),
    resendOtp: jest.fn(),
    verifyOtp: jest.fn().mockResolvedValue(undefined),
    createAccount: jest.fn().mockResolvedValue(undefined),
    signIn: jest.fn(),
    refresh: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
    requestPasswordRecovery: jest.fn(),
    verifyPasswordRecovery: jest.fn(),
    resetPassword: jest.fn(),
  } as AuthGateway;
}

describe("AuthScreen signup display name", () => {
  it("blocks whitespace-only input, sends the trimmed name, and returns to Sign In without a session", async () => {
    jest.useFakeTimers();
    const auth = gateway();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<AuthScreen gateway={auth} />); });

    act(() => button(renderer.root, "Đăng ký").props.onPress());
    act(() => input(renderer.root, "Email").props.onChangeText("mai@example.com"));
    await act(async () => { button(renderer.root, "Gửi OTP").props.onPress(); await Promise.resolve(); });
    act(() => input(renderer.root, "Mã OTP").props.onChangeText("123456"));
    await act(async () => { button(renderer.root, "Tiếp tục").props.onPress(); await Promise.resolve(); });

    act(() => input(renderer.root, "Họ và tên").props.onChangeText("   "));
    act(() => input(renderer.root, "Mật khẩu").props.onChangeText("Strong!1"));
    act(() => input(renderer.root, "Nhập lại mật khẩu").props.onChangeText("Strong!1"));
    act(() => button(renderer.root, "Đăng ký").props.onPress());
    expect(auth.createAccount).not.toHaveBeenCalled();
    expect(textOf(renderer.root)).toContain("Nhập họ và tên.");

    act(() => input(renderer.root, "Họ và tên").props.onChangeText("  Mai An  "));
    await act(async () => { button(renderer.root, "Đăng ký").props.onPress(); await Promise.resolve(); });
    expect(auth.createAccount).toHaveBeenCalledWith("mai@example.com", "attempt-1", "123456", "Strong!1", "Mai An");
    expect(auth.signIn).not.toHaveBeenCalled();
    expect(textOf(renderer.root)).toContain("Đăng ký thành công. Hãy đăng nhập để tiếp tục.");

    act(() => renderer.unmount());
    jest.useRealTimers();
  });
});
