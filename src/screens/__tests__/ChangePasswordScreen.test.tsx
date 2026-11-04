import React from "react";
import { Pressable, Text, TextInput } from "react-native";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";

import { ChangePasswordScreen } from "../ChangePasswordScreen";

jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
jest.mock("@expo/vector-icons/FontAwesome", () => "FontAwesome");
function copy(root: ReactTestInstance) { return root.findAllByType(Text).map((node) => node.props.children).flat(Infinity).join("|"); }
function button(root: ReactTestInstance, label: string) { const found = root.findAllByType(Pressable).find((node) => copy(node).includes(label)); if (!found) throw new Error(`Missing ${label}`); return found; }
function completeForm(root: ReactTestInstance) { const fields = root.findAllByType(TextInput); act(() => { fields[0]!.props.onChangeText("Aa1!current"); fields[1]!.props.onChangeText("Bb2@changed"); fields[2]!.props.onChangeText("Bb2@changed"); }); }

describe("ChangePasswordScreen", () => {
  it("renders protected, labeled fields and blocks invalid submission", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<ChangePasswordScreen onExit={jest.fn()} onSessionExpired={jest.fn()} onSuccess={jest.fn()} />); });
    const fields = renderer.root.findAllByType(TextInput);
    expect(fields).toHaveLength(3);
    expect(fields.every((field) => field.props.secureTextEntry)).toBe(true);
    expect(renderer.root.findByProps({ accessibilityLabel: "Mật khẩu hiện tại" })).toBeTruthy();
    expect(copy(renderer.root)).not.toContain("Nhập mật khẩu hiện tại.");
    expect(renderer.root.findAllByType(Pressable).filter((node) => node.props.accessibilityLabel === "Hiện mật khẩu")).toHaveLength(3);
    expect(button(renderer.root, "Đổi mật khẩu").props.accessibilityState).toEqual({ disabled: true });
  });

  it("validates only after each field blurs, then updates that error while typing", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<ChangePasswordScreen onExit={jest.fn()} onSessionExpired={jest.fn()} onSuccess={jest.fn()} />); });
    const fields = renderer.root.findAllByType(TextInput);
    act(() => fields[1]!.props.onBlur());
    expect(copy(renderer.root)).toContain("Nhập mật khẩu mới.");
    expect(copy(renderer.root)).not.toContain("Nhập mật khẩu hiện tại.");
    act(() => fields[1]!.props.onChangeText("Bb2@changed"));
    expect(copy(renderer.root)).not.toContain("Nhập mật khẩu mới.");
    act(() => { fields[2]!.props.onChangeText("mismatch"); fields[2]!.props.onBlur(); });
    expect(copy(renderer.root)).toContain("Xác nhận mật khẩu mới không khớp.");
  });

  it("prevents double submission and clears values before the success handoff", async () => {
    const onSuccess = jest.fn(); let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<ChangePasswordScreen onExit={jest.fn()} onSessionExpired={jest.fn()} onSuccess={onSuccess} />); });
    completeForm(renderer.root);
    await act(async () => { button(renderer.root, "Đổi mật khẩu").props.onPress(); button(renderer.root, "Đổi mật khẩu").props.onPress(); await Promise.resolve(); });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByType(TextInput).map((field) => field.props.value)).toEqual(["", "", ""]);
  });

  it("clears only the current field for a generic invalid-current response", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<ChangePasswordScreen reviewResult="invalid-current" onExit={jest.fn()} onSessionExpired={jest.fn()} onSuccess={jest.fn()} />); });
    completeForm(renderer.root);
    await act(async () => { button(renderer.root, "Đổi mật khẩu").props.onPress(); await Promise.resolve(); });
    expect(copy(renderer.root)).toContain("Mật khẩu hiện tại không đúng");
    expect(renderer.root.findAllByType(TextInput).map((field) => field.props.value)).toEqual(["", "Bb2@changed", "Bb2@changed"]);
  });

  it("confirms discard on dirty cancel and routes session expiry through the shared handler", async () => {
    const onExit = jest.fn(); const onSessionExpired = jest.fn(); let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<ChangePasswordScreen reviewResult="session" onExit={onExit} onSessionExpired={onSessionExpired} onSuccess={jest.fn()} />); });
    act(() => renderer.root.findAllByType(TextInput)[0]!.props.onChangeText("Aa1!current"));
    act(() => button(renderer.root, "Hủy").props.onPress());
    expect(copy(renderer.root)).toContain("Hủy đổi mật khẩu?");
    expect(copy(renderer.root)).toContain("Thao tác đổi mật khẩu chưa hoàn tất. Bạn có chắc muốn hủy?");
    act(() => button(renderer.root, "Hủy đổi mật khẩu").props.onPress());
    expect(onExit).toHaveBeenCalledTimes(1);
    completeForm(renderer.root);
    await act(async () => { button(renderer.root, "Đổi mật khẩu").props.onPress(); await Promise.resolve(); });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });
});
