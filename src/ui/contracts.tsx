import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, radius } from "@/theme/tokens";

export type ButtonProps = { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; tone?: "primary" | "secondary" | "danger"; accessibilityLabel?: string };
export function Button({ label, onPress, disabled = false, loading = false, tone = "primary", accessibilityLabel }: ButtonProps) {
  const blocked = disabled || loading;
  const toneStyle = tone === "primary" ? styles.primary : tone === "secondary" ? styles.secondary : styles.danger;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled: blocked }} disabled={blocked} onPress={onPress} style={({ pressed }) => [styles.button, toneStyle, (pressed || blocked) && styles.pressed]}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.buttonText, tone === "secondary" && styles.secondaryText]}>{label}</Text>}</Pressable>;
}

export type FieldProps = Pick<TextInputProps, "autoCapitalize" | "keyboardType" | "maxLength"> & { label: string; value: string; onChangeText: (value: string) => void; error?: string; hint?: string; required?: boolean; disabled?: boolean };
export function Field({ label, value, onChangeText, error, hint, required = false, disabled = false, autoCapitalize = "none", keyboardType = "default", maxLength }: FieldProps) {
  return <View style={styles.field}><Text style={styles.label}>{label}{required ? " *" : ""}</Text><TextInput accessibilityLabel={label} accessibilityHint={hint} autoCapitalize={autoCapitalize} autoCorrect={false} editable={!disabled} keyboardType={keyboardType} maxLength={maxLength} onChangeText={onChangeText} style={[styles.input, error && styles.inputError]} value={value} />{hint ? <Text style={styles.hint}>{hint}</Text> : null}{error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}</View>;
}

export function Dialog({ visible, title, message, onDismiss, children }: { visible: boolean; title: string; message: string; onDismiss: () => void; children: React.ReactNode }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}><View style={styles.backdrop}><View accessibilityLabel={title} accessibilityRole="alert" accessibilityViewIsModal style={styles.dialog}><Text accessibilityRole="header" style={styles.dialogTitle}>{title}</Text><Text style={styles.dialogMessage}>{message}</Text><View style={styles.dialogActions}>{children}</View></View></View></Modal>;
}

export function ScreenState({ kind, message, onRetry }: { kind: "loading" | "empty" | "error" | "session"; message?: string; onRetry?: () => void }) {
  if (kind === "loading") return <View accessibilityLabel={message ?? "Đang tải"} style={styles.state}><ActivityIndicator color={colors.action} />{message ? <Text style={styles.stateText}>{message}</Text> : null}</View>;
  return <View accessibilityRole={kind === "error" || kind === "session" ? "alert" : undefined} style={styles.state}><Text style={styles.stateText}>{message}</Text>{onRetry ? <Button label={kind === "session" ? "Đăng nhập lại" : "Thử lại"} onPress={onRetry} /> : null}</View>;
}

const styles = StyleSheet.create({
  button: { alignItems: "center", borderRadius: radius.sm, flex: 1, justifyContent: "center", minHeight: 50, paddingHorizontal: 16 }, primary: { backgroundColor: colors.action }, secondary: { backgroundColor: "#FFFFFF", borderColor: colors.action, borderWidth: 1 }, danger: { backgroundColor: colors.danger }, pressed: { opacity: 0.55 }, buttonText: { color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 16 }, secondaryText: { color: colors.action },
  field: { marginBottom: 22 }, label: { color: "#2E2E2E", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 16, marginBottom: 8 }, input: { backgroundColor: "#FFFFFF", borderColor: "#D9C4A4", borderRadius: radius.sm, borderWidth: 1, color: "#2E2E2E", fontFamily: "BeVietnamPro_400Regular", fontSize: 16, minHeight: 50, paddingHorizontal: 14 }, inputError: { borderColor: colors.danger, borderWidth: 2 }, hint: { color: "#675440", fontFamily: "BeVietnamPro_400Regular", fontSize: 13, lineHeight: 19, marginTop: 6 }, error: { color: colors.danger, fontFamily: "BeVietnamPro_600SemiBold", fontSize: 13, lineHeight: 19, marginTop: 6 },
  state: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: radius.md, gap: 14, margin: 24, padding: 28 }, stateText: { color: "#675440", fontFamily: "BeVietnamPro_400Regular", fontSize: 15, lineHeight: 23, textAlign: "center" },
  backdrop: { alignItems: "center", backgroundColor: "rgba(46, 46, 46, 0.42)", flex: 1, justifyContent: "center", padding: 24 }, dialog: { backgroundColor: "#FFFFFF", borderRadius: radius.md, maxWidth: 480, padding: 24, width: "100%" }, dialogTitle: { color: "#2E2E2E", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 21 }, dialogMessage: { color: "#675440", fontFamily: "BeVietnamPro_400Regular", fontSize: 15, lineHeight: 23, marginTop: 12 }, dialogActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", marginTop: 22 },
});
