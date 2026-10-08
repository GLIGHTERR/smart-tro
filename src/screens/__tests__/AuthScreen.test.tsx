import React from "react";
import { Pressable, Text } from "react-native";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";

import type { AuthGateway } from "../../auth/gateway";
import { AuthScreen } from "../AuthScreen";

jest.mock("@expo/vector-icons/FontAwesome", () => "FontAwesome");
jest.mock("@expo-google-fonts/be-vietnam-pro/useFonts", () => ({ useFonts: () => [true, null] }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
const mockSignIn = jest.fn();
jest.mock("@/auth/AuthProvider", () => ({ useAuth: () => ({ signIn: mockSignIn }) }));
jest.mock("@/auth/recoveryReview", () => ({ getRecoveryReviewStep: () => null }));

function textOf(node: ReactTestInstance): string {
  return node.findAllByType(Text).map((text) => text.props.children).flat(Infinity).join("");
}

function button(root: ReactTestInstance, label: string): ReactTestInstance {
  const result = root.findAllByType(Pressable).find((pressable) => textOf(pressable) === label);
  if (!result) throw new Error(`Missing button: ${label}`);
  return result;
}

function input(root: ReactTestInstance, label: string): ReactTestInstance {
  return root.findByProps({ accessibilityLabel: label }) as ReactTestInstance;
}

function buttonLabels(root: ReactTestInstance): string[] {
  return root.findAllByType(Pressable).map(textOf);
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
    resetPassword: jest.fn()
  } as AuthGateway;
}

async function startSignup(renderer: TestRenderer.ReactTestRenderer, auth: AuthGateway) {
  act(() => button(renderer.root, "Đăng ký").props.onPress());
  act(() => input(renderer.root, "Email").props.onChangeText(" Mai@Example.COM "));
  await act(async () => { button(renderer.root, "Gửi OTP").props.onPress(); await Promise.resolve(); });
  expect(auth.requestOtp).toHaveBeenCalledWith("mai@example.com");
  act(() => input(renderer.root, "Mã OTP").props.onChangeText("123456"));
  await act(async () => { button(renderer.root, "Tiếp tục").props.onPress(); await Promise.resolve(); });
  expect(auth.verifyOtp).toHaveBeenCalledWith("mai@example.com", "attempt-1", "123456");
}

describe("AuthScreen signup", () => {
  beforeEach(() => { mockSignIn.mockReset(); jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it("completes the approved four-step flow with normalized profile data and no auto-login", async () => {
    const auth = gateway();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<AuthScreen gateway={auth} />); });

    await startSignup(renderer, auth);
    act(() => input(renderer.root, "Họ và tên (bắt buộc)").props.onChangeText("  Mai   An  "));
    act(() => input(renderer.root, "Số điện thoại (không bắt buộc)").props.onChangeText(" +84 (901) 234-567 "));
    act(() => button(renderer.root, "Tiếp tục").props.onPress());
    act(() => input(renderer.root, "Mật khẩu").props.onChangeText("Strong!1"));
    act(() => input(renderer.root, "Nhập lại mật khẩu").props.onChangeText("Strong!1"));
    await act(async () => { button(renderer.root, "Tạo tài khoản").props.onPress(); await Promise.resolve(); });

    expect(auth.createAccount).toHaveBeenCalledWith("mai@example.com", "attempt-1", "123456", "Strong!1", { displayName: "Mai An", phone: "+84 (901) 234-567" });
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(textOf(renderer.root)).toContain("Đăng ký thành công. Hãy đăng nhập để tiếp tục.");
    act(() => renderer.unmount());
  });

  it("clears entered OTP on email change and clears passwords while retaining personal data on Back", async () => {
    const auth = gateway();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<AuthScreen gateway={auth} />); });

    act(() => button(renderer.root, "Đăng ký").props.onPress());
    act(() => input(renderer.root, "Email").props.onChangeText("mai@example.com"));
    await act(async () => { button(renderer.root, "Gửi OTP").props.onPress(); await Promise.resolve(); });
    act(() => input(renderer.root, "Mã OTP").props.onChangeText("123456"));
    act(() => button(renderer.root, "Đổi email").props.onPress());
    expect(input(renderer.root, "Email").props.value).toBe("mai@example.com");
    await act(async () => { button(renderer.root, "Gửi OTP").props.onPress(); await Promise.resolve(); });
    expect(auth.requestOtp).toHaveBeenCalledTimes(1);
    expect(input(renderer.root, "Mã OTP").props.value).toBe("");

    act(() => input(renderer.root, "Mã OTP").props.onChangeText("123456"));
    await act(async () => { button(renderer.root, "Tiếp tục").props.onPress(); await Promise.resolve(); });
    act(() => input(renderer.root, "Họ và tên (bắt buộc)").props.onChangeText("Mai"));
    act(() => input(renderer.root, "Số điện thoại (không bắt buộc)").props.onChangeText("0901234567"));
    act(() => button(renderer.root, "Tiếp tục").props.onPress());
    act(() => input(renderer.root, "Mật khẩu").props.onChangeText("Strong!1"));
    act(() => input(renderer.root, "Nhập lại mật khẩu").props.onChangeText("Strong!1"));
    act(() => button(renderer.root, "Quay lại").props.onPress());
    expect(input(renderer.root, "Họ và tên (bắt buộc)").props.value).toBe("Mai");
    expect(input(renderer.root, "Số điện thoại (không bắt buộc)").props.value).toBe("0901234567");
    act(() => button(renderer.root, "Tiếp tục").props.onPress());
    expect(input(renderer.root, "Mật khẩu").props.value).toBe("");
    expect(input(renderer.root, "Nhập lại mật khẩu").props.value).toBe("");
    act(() => renderer.unmount());
  });

  it("uses the approved action order and keeps all three social buttons behind the review flag", async () => {
    const auth = gateway();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<AuthScreen gateway={auth} showSocials />); });

    expect(buttonLabels(renderer.root)).toEqual(expect.arrayContaining(["Đăng nhập với Facebook", "Đăng nhập với Google", "Đăng nhập với Apple"]));
    act(() => button(renderer.root, "Đăng ký").props.onPress());
    act(() => input(renderer.root, "Email").props.onChangeText("mai@example.com"));
    await act(async () => { button(renderer.root, "Gửi OTP").props.onPress(); await Promise.resolve(); });
    const otpButtons = buttonLabels(renderer.root);
    expect(otpButtons.indexOf("Đổi email")).toBeLessThan(otpButtons.indexOf("Tiếp tục"));
    expect(otpButtons.indexOf("Tiếp tục")).toBeLessThan(otpButtons.findIndex((label) => label.startsWith("Gửi lại mã OTP")));

    act(() => input(renderer.root, "Mã OTP").props.onChangeText("123456"));
    await act(async () => { button(renderer.root, "Tiếp tục").props.onPress(); await Promise.resolve(); });
    act(() => input(renderer.root, "Họ và tên (bắt buộc)").props.onChangeText("Mai"));
    act(() => button(renderer.root, "Tiếp tục").props.onPress());
    const passwordButtons = buttonLabels(renderer.root);
    expect(passwordButtons.indexOf("Tạo tài khoản")).toBeLessThan(passwordButtons.indexOf("Quay lại"));
    act(() => renderer.unmount());
  });
});
