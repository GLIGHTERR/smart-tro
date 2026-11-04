import React from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import { Button, Dialog, Field, FormPasswordField, PressableControl, ScreenState, UiProvider, smartTroAntTheme } from "../contracts";

jest.mock("@expo/vector-icons/FontAwesome", () => "FontAwesome");

describe("production UI contracts", () => {
  it("uses the Ant provider and locks its SmartTro state palette", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<UiProvider><View /></UiProvider>); });
    expect(renderer.root.findByType(View).props.theme).toMatchObject({ brand_primary: "#A84300", brand_primary_tap: "#8D3A00", brand_success: "#2D7A46", brand_warning: "#E7A93C", brand_error: "#B33A3A", fill_disabled: "#F2E8D8" });
    expect(smartTroAntTheme.ghost_button_color).toBe("#A84300");
  });

  it.each([["primary", "primary"], ["secondary", "ghost"], ["danger", "warning"]] as const)("maps %s controls through the vendor button", (tone, type) => {
    const onPress = jest.fn(); let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<Button label="Save" onPress={onPress} tone={tone} />); });
    const control = renderer.root.findByType(Pressable);
    expect(control.props.type).toBe(type);
    act(() => control.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("blocks disabled and loading controls without changing their accessibility state", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<><Button disabled label="Disabled" onPress={jest.fn()} /><Button label="Loading" loading onPress={jest.fn()} /></>); });
    for (const control of renderer.root.findAllByType(Pressable)) expect(control.props.accessibilityState).toEqual({ disabled: true });
  });

  it("forwards accessible press interactions through the public control contract", () => {
    const onBlur = jest.fn(); const onFocus = jest.fn(); const onPress = jest.fn(); let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<PressableControl accessibilityRole="tab" accessibilityState={{ selected: true }} onBlur={onBlur} onFocus={onFocus} onPress={onPress}><Text>Tab</Text></PressableControl>); });
    const control = renderer.root.findByType(Pressable);
    expect(control.props).toMatchObject({ accessibilityRole: "tab", accessibilityState: { selected: true } });
    act(() => { control.props.onFocus(); control.props.onBlur(); control.props.onPress(); });
    expect(onFocus).toHaveBeenCalledTimes(1); expect(onBlur).toHaveBeenCalledTimes(1); expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["normal", {}],
    ["focused", { value: "0901" }],
    ["error", { error: "Invalid" }],
    ["disabled", { disabled: true }],
    ["helper", { hint: "Help" }],
  ])("suppresses vendor error and separator treatment in the %s Field state", (_state, state) => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<Field label="Phone" onChangeText={jest.fn()} value="" {...state} />); });
    const input = renderer.root.findByType(TextInput);
    expect(input.props.error).toBeUndefined();
    expect(input.props.last).toBe(true);
    if ("error" in state) expect(input.props.styles.input).toMatchObject({ borderColor: "#B33A3A", borderWidth: 2 });
  });

  it("renders every Field as a vertical label, input, helper/error contract", () => {
    const onChangeText = jest.fn(); let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<Field disabled error="Invalid" hint="Help" label="Phone" maxLength={10} onChangeText={onChangeText} required value="0901" keyboardType="phone-pad" />); });
    const input = renderer.root.findByType(TextInput);
    expect(input.parent?.parent?.parent?.props.children).toBeUndefined();
    expect(renderer.root.findAllByType(Text).map((node) => node.props.children)).toEqual([["Phone", " *"], "Help", "Invalid"]);
    expect(input.props).toMatchObject({ accessibilityHint: "Help", accessibilityLabel: "Phone", disabled: true, keyboardType: "phone-pad", maxLength: 10, value: "0901" });
    expect(input.props.error).toBeUndefined();
    act(() => input.props.onChangeText("0902"));
    expect(onChangeText).toHaveBeenCalledWith("0902");
    expect(renderer.root.findByProps({ accessibilityLiveRegion: "polite" }).props).toMatchObject({ accessibilityRole: "alert", children: "Invalid", style: expect.objectContaining({ includeFontPadding: true, lineHeight: 19, minHeight: 19 }) });
    act(() => { renderer.update(<Field label="Name" onChangeText={onChangeText} value="Mai" />); });
    expect(renderer.root.findByType(TextInput).props.disabled).toBe(false);
    expect(renderer.root.findAllByType(Text).map((node) => node.props.children)).toEqual([["Name", ""]]);
  });

  it("keeps password reveal controls inside the outlined Field family", () => {
    const onBlur = jest.fn(); const onChangeText = jest.fn(); const onTogglePassword = jest.fn(); let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<FormPasswordField error="Invalid" hint="Help" label="Password" maxLength={128} onBlur={onBlur} onChangeText={onChangeText} onTogglePassword={onTogglePassword} passwordVisible={false} required value="secret" />); });
    const input = renderer.root.findByType(TextInput);
    expect(input.props).toMatchObject({ accessibilityLabel: "Password", maxLength: 128, type: "password", value: "secret" });
    expect(input.props.styles.input).toMatchObject({ backgroundColor: "#FFFFFF", borderColor: "#B33A3A", borderRadius: 8, borderWidth: 2, height: 50, paddingRight: 50 });
    expect(renderer.root.findAllByType(Text).map((node) => node.props.children)).toEqual([["Password", " *"], "Help", "Invalid"]);
    const reveal = renderer.root.findByProps({ accessibilityLabel: "Hiện mật khẩu" });
    expect(StyleSheet.flatten(reveal.props.style)).toMatchObject({ height: 50, position: "absolute", right: 0, width: 50 });
    act(() => { input.props.onBlur(); input.props.onChangeText("changed"); reveal.props.onPress(); });
    expect(onBlur).toHaveBeenCalledTimes(1); expect(onChangeText).toHaveBeenCalledWith("changed"); expect(onTogglePassword).toHaveBeenCalledTimes(1);
    act(() => { renderer.update(<FormPasswordField label="Password" onBlur={onBlur} onChangeText={onChangeText} onTogglePassword={onTogglePassword} passwordVisible value="secret" />); });
    expect(renderer.root.findByType(TextInput).props.type).toBe("text");
    expect(renderer.root.findByProps({ accessibilityLabel: "Ẩn mật khẩu" }).props.accessibilityState).toEqual({ expanded: true });
  });

  it("maps dialogs and all screen states through public contracts", () => {
    const onDismiss = jest.fn(); const onRetry = jest.fn(); let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<Dialog visible title="Confirm" message="Continue?" onDismiss={onDismiss}><Button label="OK" onPress={jest.fn()} /></Dialog>); });
    const modal = renderer.root.findAllByType(View).find((node) => node.props.title === "Confirm");
    expect(modal?.props).toMatchObject({ animationType: "fade", maskClosable: false, modalType: "modal", transparent: true, visible: true });
    act(() => modal!.props.onRequestClose());
    expect(onDismiss).toHaveBeenCalledTimes(1);
    const platform = jest.replaceProperty(Platform, "OS", "web");
    act(() => { renderer.update(<Dialog visible title="Web confirm" message="Continue?" onDismiss={onDismiss}><Button label="OK" onPress={jest.fn()} /></Dialog>); });
    expect(renderer.root.findAllByType(View).find((node) => node.props.title === "Web confirm")?.props.modalType).toBe("portal");
    platform.restore();
    for (const kind of ["loading", "empty", "error", "session"] as const) {
      act(() => { renderer.update(<ScreenState kind={kind} message="State" onRetry={kind === "loading" ? undefined : onRetry} />); });
    }
    act(() => { renderer.update(<ScreenState kind="session" message="State" onRetry={onRetry} />); });
    expect(renderer.root.findByType(Pressable).props.children.props.children).toBe("Đăng nhập lại");
    expect(renderer.root.findByProps({ accessibilityRole: "alert" })).toBeTruthy();
    act(() => { renderer.update(<ScreenState kind="empty" message="State" />); });
  });

  it("keeps dialog content inside narrow native viewports while preserving full-width actions", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<Dialog visible title="Đăng xuất?" message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?" onDismiss={jest.fn()}><Button label="Hủy" onPress={jest.fn()} tone="secondary" /><Button label="Đăng xuất" onPress={jest.fn()} tone="danger" /></Dialog>); });
    const modal = renderer.root.findAllByType(View).find((node) => node.props.title === "Đăng xuất?")!;
    expect(StyleSheet.flatten(modal.props.style)).toMatchObject({ alignSelf: "center", marginHorizontal: 24, maxWidth: 480, width: "auto" });
    const content = renderer.root.findByProps({ accessibilityLabel: "Đăng xuất?" });
    expect(StyleSheet.flatten(content.findAllByType(Text)[0]!.props.style)).toMatchObject({ flexShrink: 1, lineHeight: 23 });
    const actions = content.findAllByType(View).find((node) => StyleSheet.flatten(node.props.style)?.width === "100%")!;
    expect(StyleSheet.flatten(actions.props.style)).toMatchObject({ flexDirection: "row", flexWrap: "wrap", width: "100%" });
    for (const action of actions.findAllByType(Pressable)) expect(StyleSheet.flatten(action.props.style)).toMatchObject({ flex: 1, minHeight: 50 });
  });

  it("covers session alerts and screen states without a retry action", () => {
    let session!: TestRenderer.ReactTestRenderer;
    let error!: TestRenderer.ReactTestRenderer;
    let loading!: TestRenderer.ReactTestRenderer;
    act(() => { session = TestRenderer.create(<ScreenState kind="session" message="Expired" onRetry={jest.fn()} />); });
    expect(session.root.findByProps({ accessibilityRole: "alert" })).toBeTruthy();
    act(() => { error = TestRenderer.create(<ScreenState kind="error" message="Offline" />); });
    expect(error.root.findAllByType(Pressable)).toHaveLength(0);
    act(() => { loading = TestRenderer.create(<ScreenState kind="loading" />); });
    expect(loading.root.findByProps({ accessibilityLabel: "Đang tải" })).toBeTruthy();
  });
});
