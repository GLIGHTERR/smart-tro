import React from "react";
import { Pressable, Text, TextInput } from "react-native";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";

import { ChangePasswordScreen } from "../ChangePasswordScreen";
import { ChangePasswordGatewayError, type ChangePasswordGateway } from "../changePasswordGateway";

jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));

function copy(root: ReactTestInstance) { return root.findAllByType(Text).map((node) => node.props.children).flat(Infinity).join("|"); }
function button(root: ReactTestInstance, label: string) { const found = root.findAllByType(Pressable).find((node) => copy(node).includes(label)); if (!found) throw new Error(`Missing ${label}`); return found; }
function gateway(change = jest.fn().mockResolvedValue(undefined)): ChangePasswordGateway { return { change }; }
function fill(root: ReactTestInstance) {
  const fields = root.findAllByType(TextInput);
  act(() => { fields[0]!.props.onChangeText("Current1!"); fields[1]!.props.onChangeText("Changed2@"); fields[2]!.props.onChangeText("Changed2@"); });
}

describe("ChangePasswordScreen", () => {
  it("uses the approved API success result, preserves the current session, and returns to Account", async () => {
    const change = jest.fn().mockResolvedValue(undefined); const onSuccess = jest.fn(); const onSessionExpired = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<ChangePasswordScreen gateway={gateway(change)} createIdempotencyKey={() => "key-1"} onExit={jest.fn()} onSessionExpired={onSessionExpired} onSuccess={onSuccess} sessionKey="active-token" />); });
    fill(renderer.root);
    await act(async () => { await button(renderer.root, "Đổi mật khẩu").props.onPress(); });
    expect(change).toHaveBeenCalledWith("active-token", { currentPassword: "Current1!", newPassword: "Changed2@", confirmation: "Changed2@", idempotencyKey: "key-1" });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("keeps the same idempotency key and the entered values for a retryable timeout", async () => {
    const change = jest.fn().mockRejectedValueOnce(new ChangePasswordGatewayError("TIMEOUT")).mockResolvedValueOnce(undefined); const createIdempotencyKey = jest.fn(() => "retry-key");
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<ChangePasswordScreen gateway={gateway(change)} createIdempotencyKey={createIdempotencyKey} onExit={jest.fn()} onSessionExpired={jest.fn()} onSuccess={jest.fn()} sessionKey="active-token" />); });
    fill(renderer.root);
    await act(async () => { await button(renderer.root, "Đổi mật khẩu").props.onPress(); });
    expect(copy(renderer.root)).toContain("Chưa thể xác nhận kết quả thay đổi. Vui lòng thử lại sau.");
    expect(renderer.root.findAllByType(TextInput).map((field) => field.props.value)).toEqual(["Current1!", "Changed2@", "Changed2@"]);
    await act(async () => { await button(renderer.root, "Đổi mật khẩu").props.onPress(); });
    expect(change.mock.calls.map((call) => call[1].idempotencyKey)).toEqual(["retry-key", "retry-key"]);
    expect(createIdempotencyKey).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["INVALID_CURRENT_PASSWORD", "Mật khẩu hiện tại không đúng. Vui lòng thử lại."],
    ["VALIDATION_ERROR", "Thông tin mật khẩu chưa hợp lệ. Vui lòng kiểm tra lại."],
    ["RATE_LIMITED", "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau."],
    ["CONFLICT", "Mật khẩu vừa được thay đổi. Vui lòng kiểm tra lại trước khi thử tiếp."],
    ["UNAVAILABLE", "Chưa thể xác nhận kết quả thay đổi. Vui lòng thử lại sau."]
  ] as const)("keeps the draft and shows a safe %s error", async (code, message) => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<ChangePasswordScreen gateway={gateway(jest.fn().mockRejectedValue(new ChangePasswordGatewayError(code)))} onExit={jest.fn()} onSessionExpired={jest.fn()} onSuccess={jest.fn()} sessionKey="active-token" />); });
    fill(renderer.root);
    await act(async () => { await button(renderer.root, "Đổi mật khẩu").props.onPress(); });
    expect(copy(renderer.root)).toContain(message);
    expect(renderer.root.findAllByType(TextInput)[1]!.props.value).toBe("Changed2@");
  });

  it("clears local password values and delegates only a confirmed invalid session to auth", async () => {
    const onSessionExpired = jest.fn(); let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<ChangePasswordScreen gateway={gateway(jest.fn().mockRejectedValue(new ChangePasswordGatewayError("INVALID_SESSION")))} onExit={jest.fn()} onSessionExpired={onSessionExpired} onSuccess={jest.fn()} sessionKey="active-token" />); });
    fill(renderer.root);
    await act(async () => { await button(renderer.root, "Đổi mật khẩu").props.onPress(); });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByType(TextInput).map((field) => field.props.value)).toEqual(["", "", ""]);
  });
});
