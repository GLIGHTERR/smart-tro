import React from "react";
import { FlatList, Pressable, Text } from "react-native";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";

import { AccountScreen } from "../AccountScreen";

jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));

function text(root: ReactTestInstance) { return root.findAllByType(Text).map((node) => node.props.children).flat(Infinity).join("|"); }
function press(root: ReactTestInstance, label: string) { const button = root.findAllByType(Pressable).find((node) => text(node).includes(label)); if (!button) throw new Error(`Missing ${label}`); act(() => button.props.onPress()); }

describe("AccountScreen", () => {
  const priorScenario = process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO;
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => { jest.useRealTimers(); process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO = priorScenario; });

  it("renders loading without subject data, then the zero-contract ready state and account actions", () => {
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO = "zero";
    const onBack = jest.fn(); const onEditProfile = jest.fn(); const onChangePassword = jest.fn(); const onSignOut = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<AccountScreen onBack={onBack} onChangePassword={onChangePassword} onEditProfile={onEditProfile} onSignOut={onSignOut} sessionKey="renter-a" />); });
    expect(renderer.root.findByProps({ accessibilityLabel: "Đang tải thông tin tài khoản" })).toBeTruthy();
    expect(text(renderer.root)).not.toContain("Nguyễn Văn A");
    act(() => { jest.advanceTimersByTime(220); });
    expect(text(renderer.root)).toContain("Cá nhân"); expect(text(renderer.root)).toContain("Chữ ký");
    expect(text(renderer.root)).not.toContain("Đang thuê");
    press(renderer.root, "Đổi mật khẩu"); press(renderer.root, "Đăng xuất");
    const back = renderer.root.findAllByType(Pressable).find((node) => node.props.accessibilityLabel === "Quay lại");
    const edit = renderer.root.findAllByType(Pressable).find((node) => node.props.accessibilityLabel === "Chỉnh sửa thông tin cá nhân");
    act(() => back!.props.onPress());
    act(() => edit!.props.onPress());
    expect(onBack).toHaveBeenCalledTimes(1); expect(onEditProfile).toHaveBeenCalledTimes(1); expect(onChangePassword).toHaveBeenCalledTimes(1); expect(onSignOut).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it("renders one contract without pagination", () => {
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO = "one";
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<AccountScreen onBack={jest.fn()} onChangePassword={jest.fn()} onEditProfile={jest.fn()} onSignOut={jest.fn()} sessionKey="renter-a" />); });
    act(() => { jest.advanceTimersByTime(220); });
    expect(text(renderer.root)).toContain("Đang thuê · 1"); expect(renderer.root.findAllByType(FlatList)).toHaveLength(0); expect(text(renderer.root)).not.toContain("1 / 1");
    act(() => renderer.unmount());
  });

  it("renders sorted multi-contract carousel with accessible actual page count", () => {
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO = "multiple";
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<AccountScreen onBack={jest.fn()} onChangePassword={jest.fn()} onEditProfile={jest.fn()} onSignOut={jest.fn()} sessionKey="renter-a" />); });
    act(() => { jest.advanceTimersByTime(220); });
    expect(renderer.root.findByProps({ accessibilityLabel: "Đang thuê 3 hợp đồng" })).toBeTruthy(); expect(renderer.root.findByProps({ accessibilityLabel: "Hợp đồng 1 trên 3" })).toBeTruthy();
    const carousel = renderer.root.findByType(FlatList); act(() => carousel.props.onScroll({ nativeEvent: { contentOffset: { x: 360 }, layoutMeasurement: { width: 360 } } }));
    expect(renderer.root.findByProps({ accessibilityLabel: "Hợp đồng 2 trên 3" })).toBeTruthy();
    act(() => renderer.unmount());
  });

  it("keeps PII hidden in error and session-expired states", () => {
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO = "error";
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<AccountScreen onBack={jest.fn()} onChangePassword={jest.fn()} onEditProfile={jest.fn()} onSignOut={jest.fn()} sessionKey="renter-a" />); });
    act(() => { jest.advanceTimersByTime(220); });
    expect(text(renderer.root)).toContain("Chưa thể tải thông tin tài khoản."); expect(text(renderer.root)).not.toContain("Nguyễn Văn A");
    act(() => renderer.unmount());
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO = "session";
    act(() => { renderer = TestRenderer.create(<AccountScreen onBack={jest.fn()} onChangePassword={jest.fn()} onEditProfile={jest.fn()} onSignOut={jest.fn()} sessionKey="renter-b" />); });
    act(() => { jest.advanceTimersByTime(220); });
    expect(text(renderer.root)).toContain("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."); expect(text(renderer.root)).not.toContain("Nguyễn Văn A");
    act(() => renderer.unmount());
  });

  it("switches tabs without rendering a Home action in the signature placeholder", () => {
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO = "one";
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<AccountScreen onBack={jest.fn()} onChangePassword={jest.fn()} onEditProfile={jest.fn()} onSignOut={jest.fn()} sessionKey="renter-a" />); });
    act(() => { jest.advanceTimersByTime(220); });
    press(renderer.root, "Chữ ký");
    expect(text(renderer.root)).toContain("UC-32/UC-33 — Xem chữ ký điện tử.");
    expect(text(renderer.root)).not.toContain("Quay lại trang chủ");
    expect(renderer.root.findAllByType(Pressable).find((node) => text(node).includes("Cá nhân"))?.props.accessibilityState).toEqual({ selected: false });
    expect(renderer.root.findAllByType(Pressable).find((node) => text(node).includes("Chữ ký"))?.props.accessibilityState).toEqual({ selected: true });
    press(renderer.root, "Cá nhân");
    expect(text(renderer.root)).toContain("Nguyễn Văn A");
    act(() => renderer.unmount());
  });

  it("uses non-sensitive partial/error behavior for invalid email and a nullable phone label", () => {
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO = "email-invalid";
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<AccountScreen onBack={jest.fn()} onChangePassword={jest.fn()} onEditProfile={jest.fn()} onSignOut={jest.fn()} sessionKey="renter-a" />); });
    act(() => { jest.advanceTimersByTime(220); });
    expect(text(renderer.root)).toContain("Chưa thể tải thông tin tài khoản."); expect(text(renderer.root)).not.toContain("Nguyễn Văn A");
    act(() => renderer.unmount());
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO = "phone-empty";
    act(() => { renderer = TestRenderer.create(<AccountScreen onBack={jest.fn()} onChangePassword={jest.fn()} onEditProfile={jest.fn()} onSignOut={jest.fn()} sessionKey="renter-b" />); });
    act(() => { jest.advanceTimersByTime(220); });
    expect(renderer.root.findByProps({ accessibilityLabel: "Số điện thoại chưa cập nhật" })).toBeTruthy();
    act(() => renderer.unmount());
  });

  it("wraps long profile and rental text to two lines", () => {
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO = "long";
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<AccountScreen onBack={jest.fn()} onChangePassword={jest.fn()} onEditProfile={jest.fn()} onSignOut={jest.fn()} sessionKey="renter-a" />); });
    act(() => { jest.advanceTimersByTime(220); });
    expect(renderer.root.findByProps({ children: "Nguyễn Văn A có tên hiển thị rất dài để kiểm tra nội dung không bị tràn" }).props.numberOfLines).toBe(2);
    expect(renderer.root.findByProps({ children: "Nhà trọ có tên dài để kiểm tra xuống dòng an toàn ở các kích thước màn hình hỗ trợ" }).props.numberOfLines).toBe(2);
    act(() => renderer.unmount());
  });

  it("cancels or confirms sign-out exactly once while the flow is pending", async () => {
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO = "one";
    let resolveSignOut!: () => void;
    const onSignOut = jest.fn(() => new Promise<void>((resolve) => { resolveSignOut = resolve; }));
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<AccountScreen onBack={jest.fn()} onChangePassword={jest.fn()} onEditProfile={jest.fn()} onSignOut={onSignOut} sessionKey="renter-a" />); });
    act(() => { jest.advanceTimersByTime(220); });
    press(renderer.root, "Đăng xuất"); expect(text(renderer.root)).toContain("Đăng xuất?");
    press(renderer.root, "Hủy"); expect(text(renderer.root)).not.toContain("Đăng xuất?"); expect(onSignOut).not.toHaveBeenCalled();
    press(renderer.root, "Đăng xuất");
    const confirm = renderer.root.findAllByType(Pressable).find((node) => text(node).includes("Đăng xuất") && node.props.accessibilityState?.disabled === false);
    act(() => { confirm!.props.onPress(); confirm!.props.onPress(); });
    expect(onSignOut).toHaveBeenCalledTimes(1);
    await act(async () => { resolveSignOut(); await Promise.resolve(); });
    act(() => renderer.unmount());
  });
});
