import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "@/theme/tokens";

export function Button({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, (pressed || disabled) && styles.buttonPressed]}><Text style={styles.buttonLabel}>{label}</Text></Pressable>;
}

export function Field({ label, value, onChangeText, secureTextEntry = false, error }: { label: string; value: string; onChangeText: (value: string) => void; secureTextEntry?: boolean; error?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} secureTextEntry={secureTextEntry} autoCapitalize="none" style={[styles.input, error && styles.inputError]} accessibilityLabel={label} />{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}

export function ScreenState({ kind, message, onRetry }: { kind: "loading" | "empty" | "error"; message?: string; onRetry?: () => void }) {
  if (kind === "loading") return <View style={styles.state}><ActivityIndicator color={colors.primary} /></View>;
  return <View style={styles.state}><Text style={styles.stateText}>{message ?? (kind === "empty" ? "Nothing here yet." : "Something went wrong.")}</Text>{onRetry ? <Button label="Try again" onPress={onRetry} /> : null}</View>;
}

const styles = StyleSheet.create({
  button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  buttonPressed: { backgroundColor: colors.primaryPressed, opacity: 0.8 },
  buttonLabel: { color: colors.surface, fontSize: 16, fontWeight: "700" },
  field: { gap: spacing.xs }, label: { color: colors.ink, fontWeight: "600" },
  input: { borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, color: colors.ink, padding: spacing.md },
  inputError: { borderColor: colors.danger }, error: { color: colors.danger, fontSize: 13 },
  state: { alignItems: "center", flex: 1, gap: spacing.md, justifyContent: "center", padding: spacing.xl },
  stateText: { color: colors.muted, fontSize: 16, textAlign: "center" }
});
