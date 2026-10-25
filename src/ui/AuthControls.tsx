import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Button as AntButton, InputItem } from "@ant-design/react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type TextInputProps } from "react-native";

type AuthFieldProps = Pick<TextInputProps, "keyboardType" | "secureTextEntry"> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  passwordVisible?: boolean;
  onTogglePassword?: () => void;
};

// These styles intentionally mirror the existing authentication screen palette.
export function AuthField({ label, value, onChangeText, keyboardType = "default", secureTextEntry = false, passwordVisible = false, onTogglePassword }: AuthFieldProps) {
  const reveal = secureTextEntry && onTogglePassword ? <Pressable aria-expanded={passwordVisible} accessibilityLabel={passwordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} accessibilityRole="button" accessibilityState={{ expanded: passwordVisible }} onPress={onTogglePassword} style={styles.eye}><FontAwesome color="#A84300" name={passwordVisible ? "eye-slash" : "eye"} size={17} /></Pressable> : undefined;
  return <View style={styles.field}><InputItem accessibilityLabel={label} autoCapitalize="none" autoCorrect={false} extra={reveal} last onChange={onChangeText} placeholder={label} placeholderTextColor="#A78B68" style={styles.input} styles={inputStyles} type={secureTextEntry && !passwordVisible ? "password" : keyboardType} value={value} /></View>;
}

export function AuthButton({ label, onPress, disabled = false, loading = false }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  const blocked = disabled || loading;
  const buttonStyle = blocked ? { ...styles.action, ...styles.disabled } : styles.action;
  return <AntButton accessibilityLabel={label} activeStyle={styles.disabled} disabled={blocked} loading={loading} onPress={onPress} style={buttonStyle} styles={buttonStyles} type="primary">{label}</AntButton>;
}

export function AuthLink({ label, onPress }: { label: string; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" onBlur={() => setFocused(false)} onFocus={() => setFocused(true)} onPress={onPress} style={[styles.link, focused && styles.linkFocused]}><Text style={styles.linkText}>{label}</Text></Pressable>;
}

const inputStyles = StyleSheet.create({
  container: { backgroundColor: "#FBC97E", borderBottomWidth: 0, borderRadius: 24, height: 48, marginLeft: 0, overflow: "hidden", paddingRight: 0 },
  input: { backgroundColor: "#FBC97E", borderRadius: 24, color: "#5B4126", fontFamily: "BeVietnamPro_400Regular", fontSize: 15, height: 48, paddingHorizontal: 28, paddingRight: 54 },
  extra: { alignItems: "center", height: 48, justifyContent: "center", marginRight: 0, width: 54 },
});
const buttonStyles = { primaryDisabledRawText: { color: "#F09200", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 14 }, primaryRawText: { color: "#F09200", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 14 } };
const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  input: { backgroundColor: "#FBC97E", borderRadius: 24, color: "#5B4126", fontFamily: "BeVietnamPro_400Regular", fontSize: 15, height: 48, paddingHorizontal: 28, paddingRight: 54 },
  eye: { alignItems: "center", height: 48, justifyContent: "center", width: 54 },
  action: { backgroundColor: "#FFFFFF", borderColor: "#1684F7", borderRadius: 9, borderWidth: 1.5, height: 48, marginTop: 10 },
  disabled: { opacity: 0.55 },
  link: { alignItems: "center", justifyContent: "center", minHeight: 48 },
  linkFocused: { borderColor: "#1684F7", borderWidth: 1.5 },
  linkText: { color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 12, textDecorationLine: "underline" },
});
