import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { BaseAuthField, type BaseAuthFieldProps } from "./fields/BaseAuthField";

// These styles intentionally mirror the existing authentication screen palette.
export function AuthField(props: BaseAuthFieldProps) {
  return <BaseAuthField {...props} />;
}

export function AuthButton({ label, onPress, disabled = false, loading = false }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  const blocked = disabled || loading;
  return <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled: blocked }} disabled={blocked} onPress={onPress} style={({ pressed }) => [styles.action, (pressed || blocked) && styles.disabled]}>
    {loading && <ActivityIndicator color={buttonStyles.primaryRawText.color} size="small" />}
    <Text style={blocked ? buttonStyles.primaryDisabledRawText : buttonStyles.primaryRawText}>{label}</Text>
  </Pressable>;
}

export function AuthLink({ label, onPress }: { label: string; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" onBlur={() => setFocused(false)} onFocus={() => setFocused(true)} onPress={onPress} style={[styles.link, focused && styles.linkFocused]}><Text style={styles.linkText}>{label}</Text></Pressable>;
}

const buttonStyles = { primaryDisabledRawText: { color: "#F09200", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 14 }, primaryRawText: { color: "#F09200", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 14 } };
const styles = StyleSheet.create({
  action: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#1684F7", borderRadius: 9, borderWidth: 1.5, height: 48, justifyContent: "center", marginTop: 10 },
  disabled: { opacity: 0.55 },
  link: { alignItems: "center", justifyContent: "center", minHeight: 48 },
  linkFocused: { borderColor: "#1684F7", borderWidth: 1.5 },
  linkText: { color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 12, textDecorationLine: "underline" },
});
