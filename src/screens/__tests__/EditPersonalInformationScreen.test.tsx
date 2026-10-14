import React from "react";
import { Pressable, Text, TextInput } from "react-native";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";

import { EditPersonalInformationScreen } from "../EditPersonalInformationScreen";

jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));

function copy(root: ReactTestInstance) { return root.findAllByType(Text).map((node) => node.props.children).flat(Infinity).join("|"); }
function button(root: ReactTestInstance, label: string) { const found = root.findAllByType(Pressable).find((node) => copy(node).includes(label)); if (!found) throw new Error(`Missing ${label}`); return found; }

describe("EditPersonalInformationScreen", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("renders the approved fields and keeps save disabled while clean or invalid", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<EditPersonalInformationScreen onExit={jest.fn()} onSaved={jest.fn()} onSessionError={jest.fn()} />); });
    expect(copy(renderer.root)).toContain("Cập nhật thông tin cá nhân");
    expect(copy(renderer.root)).toContain("n***r@example.com");
    expect(renderer.root.findByProps({ accessibilityLabel: "Email chỉ đọc" })).toBeTruthy();
    expect(button(renderer.root, "Lưu").props.accessibilityState).toEqual({ disabled: true });
    const fields = renderer.root.findAllByType(TextInput);
    act(() => fields[0]!.props.onChangeText("   "));
    expect(copy(renderer.root)).toContain("Họ và tên là bắt buộc.");
    expect(button(renderer.root, "Lưu").props.accessibilityState).toEqual({ disabled: true });
  });

  it("normalizes valid dirty data, shows saving, and calls the success exit once", () => {
    const onSaved = jest.fn(); let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<EditPersonalInformationScreen onExit={jest.fn()} onSaved={onSaved} onSessionError={jest.fn()} />); });
    const fields = renderer.root.findAllByType(TextInput);
    act(() => fields[0]!.props.onChangeText("  Mai   An  "));
    expect(button(renderer.root, "Lưu").props.accessibilityState).toEqual({ disabled: false });
    act(() => button(renderer.root, "Lưu").props.onPress());
    expect(renderer.root.findByProps({ accessibilityLabel: "Lưu" }).props.disabled).toBe(true);
    act(() => jest.advanceTimersByTime(500));
    expect(copy(renderer.root)).toContain("Đã lưu thông tin cá nhân.");
    act(() => jest.advanceTimersByTime(450));
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("retains edits for retryable and validation failures and presents a single discard dialog", () => {
    const onExit = jest.fn(); let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<EditPersonalInformationScreen onExit={onExit} onSaved={jest.fn()} onSessionError={jest.fn()} reviewResult="retryable" />); });
    const fields = renderer.root.findAllByType(TextInput);
    act(() => fields[1]!.props.onChangeText("0912345678"));
    act(() => button(renderer.root, "Lưu").props.onPress()); act(() => jest.advanceTimersByTime(500));
    expect(copy(renderer.root)).toContain("Chưa thể lưu thay đổi. Vui lòng thử lại.");
    expect(renderer.root.findAllByType(TextInput)[1]!.props.value).toBe("0912345678");
    act(() => button(renderer.root, "Hủy").props.onPress());
    expect(copy(renderer.root)).toContain("Hủy thay đổi?");
    act(() => button(renderer.root, "Tiếp tục chỉnh sửa").props.onPress());
    expect(copy(renderer.root)).not.toContain("Hủy thay đổi?");
    act(() => button(renderer.root, "Hủy").props.onPress()); act(() => button(renderer.root, "Bỏ thay đổi").props.onPress());
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("presents session expiry through the common session handler", () => {
    const onSessionError = jest.fn(); let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<EditPersonalInformationScreen onExit={jest.fn()} onSaved={jest.fn()} onSessionError={onSessionError} reviewResult="session" />); });
    act(() => renderer.root.findAllByType(TextInput)[0]!.props.onChangeText("Mai An")); act(() => button(renderer.root, "Lưu").props.onPress()); act(() => jest.advanceTimersByTime(500));
    expect(onSessionError).toHaveBeenCalledTimes(1);
  });

  it("intercepts dirty web history back once, preserves state on stay, and replays its pending action on discard", () => {
    let beforeRemove!: (event: { preventDefault: () => void; data: { action: { type: string } } }) => void;
    const navigation = { addListener: jest.fn((_event, listener) => { beforeRemove = listener; return jest.fn(); }), dispatch: jest.fn() };
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<EditPersonalInformationScreen navigation={navigation} onExit={jest.fn()} onSaved={jest.fn()} onSessionError={jest.fn()} />); });
    const fields = renderer.root.findAllByType(TextInput);
    act(() => fields[0]!.props.onChangeText("Mai An"));
    const firstBack = { preventDefault: jest.fn(), data: { action: { type: "GO_BACK" } } };
    act(() => { beforeRemove(firstBack); beforeRemove({ preventDefault: jest.fn(), data: { action: { type: "GO_BACK" } } }); });
    expect(firstBack.preventDefault).toHaveBeenCalledTimes(1);
    expect(copy(renderer.root).match(/Hủy thay đổi\?/g)).toHaveLength(1);
    act(() => button(renderer.root, "Tiếp tục chỉnh sửa").props.onPress());
    expect(renderer.root.findAllByType(TextInput)[0]!.props.value).toBe("Mai An");
    expect(copy(renderer.root)).not.toContain("Hủy thay đổi?");
    act(() => beforeRemove({ preventDefault: jest.fn(), data: { action: { type: "GO_BACK" } } }));
    act(() => button(renderer.root, "Bỏ thay đổi").props.onPress());
    expect(navigation.dispatch).toHaveBeenCalledTimes(1);
    expect(navigation.dispatch).toHaveBeenCalledWith({ type: "GO_BACK" });
  });

  it("does not block a clean web history back", () => {
    let beforeRemove!: (event: { preventDefault: () => void; data: { action: { type: string } } }) => void;
    const navigation = { addListener: jest.fn((_event, listener) => { beforeRemove = listener; return jest.fn(); }), dispatch: jest.fn() };
    act(() => { TestRenderer.create(<EditPersonalInformationScreen navigation={navigation} onExit={jest.fn()} onSaved={jest.fn()} onSessionError={jest.fn()} />); });
    const event = { preventDefault: jest.fn(), data: { action: { type: "GO_BACK" } } };
    act(() => beforeRemove(event));
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigation.dispatch).not.toHaveBeenCalled();
  });
});
