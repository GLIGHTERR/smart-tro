import { ActivityIndicator as AntActivityIndicator, Button as AntButton, InputItem, Modal as AntModal, Provider } from "@ant-design/react-native";
import { Platform, StyleSheet, Text, View, type TextInputProps } from "react-native";

import { colors, radius } from "@/theme/tokens";

// Keep Ant's renderer while locking every theme token to the approved SmartTro palette.
export const smartTroAntTheme = Object.freeze({ brand_primary: colors.action, brand_primary_tap: colors.primaryPressed, brand_success: "#2D7A46", brand_warning: colors.warm, brand_error: colors.danger, color_text_base: "#2E2E2E", color_text_base_inverse: "#FFFFFF", color_text_caption: "#675440", color_text_disabled: "#8D857B", fill_body: "#FFF2DB", fill_base: "#FFFFFF", fill_tap: "#F2E8D8", fill_disabled: "#F2E8D8", fill_mask: "rgba(46, 46, 46, 0.42)", border_color_base: "#D9C4A4", border_color_thin: "#E6CDA8", primary_button_fill: colors.action, primary_button_fill_tap: colors.primaryPressed, ghost_button_color: colors.action, ghost_button_fill_tap: "#F2E8D8", warning_button_fill: colors.danger, warning_button_fill_tap: "#8F2E2E", toast_fill: "#E2F3E7", radius_sm: radius.sm, radius_md: radius.md, button_height: 50, button_font_size: 16, font_size_base: 16, font_size_heading: 16, font_size_subhead: 15, modal_font_size_heading: 21, modal_button_height: 50 });

export function UiProvider({ children }: { children: React.ReactNode }) { return <Provider theme={smartTroAntTheme}>{children}</Provider>; }

export type ButtonProps = { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; tone?: "primary" | "secondary" | "danger"; accessibilityLabel?: string };
export function Button({ label, onPress, disabled = false, loading = false, tone = "primary", accessibilityLabel }: ButtonProps) {
  const blocked = disabled || loading;
  return <AntButton accessibilityLabel={accessibilityLabel} activeStyle={styles.pressed} disabled={blocked} loading={loading} onPress={onPress} style={styles.button} type={tone === "secondary" ? "ghost" : tone === "danger" ? "warning" : "primary"}>{label}</AntButton>;
}

export type FieldProps = Pick<TextInputProps, "autoCapitalize" | "keyboardType" | "maxLength"> & { label: string; value: string; onChangeText: (value: string) => void; error?: string; hint?: string; required?: boolean; disabled?: boolean };
export function Field({ label, value, onChangeText, error, hint, required = false, disabled = false, autoCapitalize = "none", keyboardType = "default", maxLength }: FieldProps) {
  const fieldStyles = error ? { ...inputStyles, input: StyleSheet.flatten([inputStyles.input, inputStyles.inputError]) } : inputStyles;
  return <View style={styles.field}><Text style={styles.label}>{label}{required ? " *" : ""}</Text><InputItem accessibilityHint={hint} accessibilityLabel={label} autoCapitalize={autoCapitalize} autoCorrect={false} disabled={disabled} keyboardType={keyboardType} last maxLength={maxLength} onChange={onChangeText} style={styles.input} styles={fieldStyles} value={value} />{hint ? <Text style={styles.hint}>{hint}</Text> : null}{error ? <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</View>;
}

export function Dialog({ visible, title, message, onDismiss, children }: { visible: boolean; title: string; message: string; onDismiss: () => void; children: React.ReactNode }) {
  return <AntModal animationType="fade" bodyStyle={styles.dialogBody} maskClosable={false} modalType={Platform.OS === "web" ? "portal" : "modal"} onClose={onDismiss} onRequestClose={() => { onDismiss(); return true; }} style={styles.dialog} title={title} transparent visible={visible}><View accessibilityLabel={title} accessibilityRole="alert" accessibilityViewIsModal><Text style={styles.dialogMessage}>{message}</Text><View style={styles.dialogActions}>{children}</View></View></AntModal>;
}

export function ScreenState({ kind, message, onRetry }: { kind: "loading" | "empty" | "error" | "session"; message?: string; onRetry?: () => void }) {
  if (kind === "loading") {
    return <View accessibilityLabel={message ?? "Đang tải"} style={styles.state}><AntActivityIndicator color={colors.action} />{message ? <Text style={styles.stateText}>{message}</Text> : null}</View>;
  }
  const alert = kind === "error" || kind === "session";
  const retryLabel = kind === "session" ? "Đăng nhập lại" : "Thử lại";
  return <View accessibilityRole={alert ? "alert" : undefined} style={styles.state}><Text style={styles.stateText}>{message}</Text>{onRetry ? <Button label={retryLabel} onPress={onRetry} /> : null}</View>;
}

const inputStyles = StyleSheet.create({ container: { borderBottomWidth: 0, height: 50, marginLeft: 0, paddingRight: 0 }, input: { backgroundColor: "#FFFFFF", borderColor: "#D9C4A4", borderRadius: radius.sm, borderWidth: 1, color: "#2E2E2E", fontFamily: "BeVietnamPro_400Regular", fontSize: 16, height: 50, paddingHorizontal: 14 }, inputDisabled: { backgroundColor: "#F2E8D8", color: "#8D857B" }, inputError: { borderColor: colors.danger, borderWidth: 2 } });
const styles = StyleSheet.create({ button: { borderRadius: radius.sm, flex: 1, minHeight: 50 }, pressed: { opacity: 0.55 }, field: { marginBottom: 22 }, label: { color: "#2E2E2E", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 16, marginBottom: 8 }, input: { minHeight: 50 }, hint: { color: "#675440", fontFamily: "BeVietnamPro_400Regular", fontSize: 13, lineHeight: 19, marginTop: 6 }, error: { color: colors.danger, fontFamily: "BeVietnamPro_600SemiBold", fontSize: 13, includeFontPadding: true, lineHeight: 19, marginTop: 6, minHeight: 19 }, state: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: radius.md, gap: 14, margin: 24, padding: 28 }, stateText: { color: "#675440", fontFamily: "BeVietnamPro_400Regular", fontSize: 15, lineHeight: 23, textAlign: "center" }, dialog: { borderRadius: radius.md, maxWidth: 480, width: "90%" }, dialogBody: { paddingBottom: 24, paddingHorizontal: 24 }, dialogMessage: { color: "#675440", fontFamily: "BeVietnamPro_400Regular", fontSize: 15, lineHeight: 23, marginTop: 12 }, dialogActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", marginTop: 22 } });
