import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { FocusWithinField } from "../FocusWithinField";
import { fieldFocusStyle, fieldPlatformProps } from "./fieldPlatform";

export type BaseAuthFieldProps = Pick<TextInputProps, "keyboardType" | "secureTextEntry"> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  passwordVisible?: boolean;
  onTogglePassword?: () => void;
};

// The shell is the only surface/chrome owner. The input and optional action
// remain transparent so native and browser autofill cannot split the field.
export function BaseAuthField({ label, value, onChangeText, keyboardType = "default", secureTextEntry = false, passwordVisible = false, onTogglePassword }: BaseAuthFieldProps) {
  const [focused, setFocused] = useState(false);
  const isPassword = secureTextEntry && Boolean(onTogglePassword);
  const type = secureTextEntry && !passwordVisible ? "password" : keyboardType;
  const reveal = isPassword ? <Pressable aria-expanded={passwordVisible} accessibilityLabel={passwordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} accessibilityRole="button" accessibilityState={{ expanded: passwordVisible }} onBlur={() => setFocused(false)} onFocus={() => setFocused(true)} onPress={onTogglePassword} style={styles.eye}><FontAwesome color="#A84300" name={passwordVisible ? "eye-slash" : "eye"} size={17} /></Pressable> : null;

  return <FocusWithinField style={[styles.field, focused && fieldFocusStyle]} testID={`auth-field-${label}`}>
    <View {...fieldPlatformProps} style={styles.surface}>
      <TextInput accessibilityLabel={label} autoCapitalize="none" autoCorrect={false} keyboardType={keyboardType} onBlur={() => setFocused(false)} onChangeText={onChangeText} onFocus={() => setFocused(true)} placeholder={label} placeholderTextColor="#A78B68" secureTextEntry={secureTextEntry && !passwordVisible} style={[styles.input, isPassword && styles.passwordInput]} testID={`auth-input-${label}`} value={value} {...({ type } as TextInputProps)} />
      {reveal}
    </View>
  </FocusWithinField>;
}

const styles = StyleSheet.create({
  // The outer shell owns the focus ring; the inner surface alone clips input paint.
  field: { backgroundColor: "#FBC97E", borderRadius: 24, height: 48, marginBottom: 16 },
  surface: { backgroundColor: "#FBC97E", borderRadius: 24, flex: 1, overflow: "hidden", position: "relative" },
  input: { backgroundColor: "transparent", borderRadius: 0, borderWidth: 0, color: "#5B4126", fontFamily: "BeVietnamPro_400Regular", fontSize: 15, height: 48, outlineColor: "transparent", outlineStyle: "solid", outlineWidth: 0, paddingHorizontal: 28 },
  passwordInput: { paddingRight: 54 },
  eye: { alignItems: "center", backgroundColor: "transparent", borderRadius: 0, borderWidth: 0, height: 48, justifyContent: "center", outlineColor: "transparent", outlineStyle: "solid", outlineWidth: 0, position: "absolute", right: 0, top: 0, width: 54 },
});
