import React from "react";
import { Pressable, TextInput } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import { AuthButton, AuthField, AuthLink } from "../AuthControls";

jest.mock("@expo/vector-icons/FontAwesome", () => "FontAwesome");

describe("auth UI adapters", () => {
  it("uses the locked field palette and preserves native keyboard and password semantics", () => {
    const onChangeText = jest.fn();
    const onTogglePassword = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<><AuthField label="Email" onChangeText={onChangeText} value="" /><AuthField keyboardType="email-address" label="Password" onChangeText={onChangeText} onTogglePassword={onTogglePassword} passwordVisible={false} secureTextEntry value="secret" /></>); });

    const inputs = renderer.root.findAllByType(TextInput);
    const [email, password] = inputs;
    if (!email || !password) throw new Error("Missing auth inputs");
    expect(email.props).toMatchObject({ autoCapitalize: "none", autoCorrect: false, placeholder: "Email", placeholderTextColor: "#A78B68", type: "default" });
    expect(password.props).toMatchObject({ type: "password", value: "secret" });
    expect(password.props.styles.container).toMatchObject({ backgroundColor: "#FBC97E", borderRadius: 24, height: 48 });
    act(() => email.props.onChangeText("mai@example.com"));
    expect(onChangeText).toHaveBeenCalledWith("mai@example.com");
    const reveal = renderer.root.findByProps({ accessibilityLabel: "Hiện mật khẩu" });
    expect(reveal.props["aria-expanded"]).toBe(false);
    act(() => reveal.props.onPress());
    expect(onTogglePassword).toHaveBeenCalledTimes(1);
    act(() => { renderer.update(<AuthField label="Password" onChangeText={onChangeText} onTogglePassword={onTogglePassword} passwordVisible secureTextEntry value="secret" />); });
    expect(renderer.root.findByType(TextInput).props.type).toBe("default");
    const hide = renderer.root.findByProps({ accessibilityLabel: "Ẩn mật khẩu" });
    expect(hide.props.accessibilityState).toEqual({ expanded: true });
    expect(hide.props["aria-expanded"]).toBe(true);
  });

  it("keeps auth button states and link focus accessible", () => {
    const onPress = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<><AuthButton label="Đăng nhập" onPress={onPress} /><AuthButton disabled label="Disabled" onPress={onPress} /><AuthButton label="Loading" loading onPress={onPress} /><AuthLink label="Đăng ký" onPress={onPress} /></>); });

    const controls = renderer.root.findAllByType(Pressable);
    const [enabled, disabled, loading] = controls;
    if (!enabled || !disabled || !loading) throw new Error("Missing auth buttons");
    expect(enabled.props).toMatchObject({ accessibilityLabel: "Đăng nhập", accessibilityState: { disabled: false }, type: "primary" });
    expect(disabled.props.accessibilityState).toEqual({ disabled: true });
    expect(loading.props.accessibilityState).toEqual({ disabled: true });
    act(() => enabled.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    const link = renderer.root.findAllByType(Pressable).find((control) => typeof control.props.onFocus === "function");
    if (!link) throw new Error("Missing auth link");
    act(() => link.props.onFocus());
    expect(link.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ borderColor: "#1684F7" })]));
    act(() => link.props.onBlur());
    expect(link.props.style).toEqual(expect.arrayContaining([false]));
  });
});
