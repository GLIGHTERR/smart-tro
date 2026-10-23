import React from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import { Button, Dialog, Field, ScreenState, UiProvider, smartTroAntTheme } from "../contracts";

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

  it("preserves a native test hook when evidence needs the rendered control state", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<Button label="Save" onPress={jest.fn()} testID="profile-save-disabled" />); });
    expect(renderer.root.findByType(Pressable).props.testID).toBe("profile-save-disabled");
  });

  it("blocks disabled and loading controls without changing their accessibility state", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<><Button disabled label="Disabled" onPress={jest.fn()} /><Button label="Loading" loading onPress={jest.fn()} /></>); });
    for (const control of renderer.root.findAllByType(Pressable)) expect(control.props.accessibilityState).toEqual({ disabled: true });
  });

  it("renders every Field as a vertical label, input, helper/error contract", () => {
    const onChangeText = jest.fn(); let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<Field disabled error="Invalid" hint="Help" label="Phone" maxLength={10} onChangeText={onChangeText} required value="0901" keyboardType="phone-pad" />); });
    const input = renderer.root.findByType(TextInput);
    expect(input.parent?.parent?.parent?.props.children).toBeUndefined();
    expect(renderer.root.findAllByType(Text).map((node) => node.props.children)).toEqual([["Phone", " *"], "Help", "Invalid"]);
    expect(input.props).toMatchObject({ accessibilityHint: "Help", accessibilityLabel: "Phone", disabled: true, error: true, keyboardType: "phone-pad", maxLength: 10, value: "0901" });
    act(() => input.props.onChangeText("0902"));
    expect(onChangeText).toHaveBeenCalledWith("0902");
    expect(renderer.root.findByProps({ accessibilityLiveRegion: "polite" }).props.children).toBe("Invalid");
    act(() => { renderer.update(<Field label="Name" onChangeText={onChangeText} value="Mai" />); });
    expect(renderer.root.findByType(TextInput).props.disabled).toBe(false);
    expect(renderer.root.findAllByType(Text).map((node) => node.props.children)).toEqual([["Name", ""]]);
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
