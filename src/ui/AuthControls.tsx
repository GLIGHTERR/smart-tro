import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { BaseAuthField, type BaseAuthFieldProps } from "./fields/BaseAuthField";

// These styles intentionally mirror the existing authentication screen palette.
export function AuthField(props: BaseAuthFieldProps) {
  return <BaseAuthField {...props} />;
}

export function AuthButton({ label, onPress, disabled = false, loading = false, variant = "primary" }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; variant?: "primary" | "secondary" }) {
  const blocked = disabled || loading;
  const [focused, setFocused] = useState(false);
  const buttonStyle = variant === "primary" ? styles.action : styles.secondaryAction;
  const textStyle = variant === "primary" ? buttonStyles.primaryRawText : styles.secondaryActionText;
  return <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled: blocked }} disabled={blocked} onBlur={() => setFocused(false)} onFocus={() => setFocused(true)} onPress={onPress} style={({ pressed }) => [buttonStyle, variant === "secondary" && focused && styles.secondaryActionFocused, (pressed || blocked) && styles.disabled]}>
    {loading && <ActivityIndicator color={buttonStyles.primaryRawText.color} size="small" />}
    <Text style={textStyle}>{label}</Text>
  </Pressable>;
}

export function AuthLink({ label, onPress }: { label: string; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" onBlur={() => setFocused(false)} onFocus={() => setFocused(true)} onPress={onPress} style={[styles.link, focused && styles.linkFocused]}><Text style={styles.linkText}>{label}</Text></Pressable>;
}

export function AuthSocialButtons({ action, onPress }: { action: string; onPress: () => void }) {
  return <View style={styles.socials}>
    <SocialButton asset={require("../../assets/social/facebook.png")} backgroundColor="#1877F2" label={`${action} với Facebook`} onPress={onPress} />
    <SocialButton asset={require("../../assets/social/google.png")} backgroundColor="#FFFFFF" label={`${action} với Google`} onPress={onPress} textColor="#777777" />
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.social, styles.apple]}><FontAwesome color="#FFFFFF" name="apple" size={24} style={styles.icon} /><Text style={styles.socialText}>{action} với Apple</Text></Pressable>
  </View>;
}

function SocialButton({ asset, backgroundColor, label, onPress, textColor = "#FFFFFF" }: { asset: number; backgroundColor: string; label: string; onPress: () => void; textColor?: string }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.social, { backgroundColor }]}><Image accessibilityIgnoresInvertColors source={asset} style={styles.brandIcon} /><Text style={[styles.socialText, { color: textColor }]}>{label}</Text></Pressable>;
}

const buttonStyles = { primaryDisabledRawText: { color: "#F09200", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 14 }, primaryRawText: { color: "#F09200", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 14 } };
const styles = StyleSheet.create({
  action: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#1684F7", borderRadius: 9, borderWidth: 1.5, height: 48, justifyContent: "center", marginTop: 10 },
  disabled: { opacity: 0.55 },
  link: { alignItems: "center", justifyContent: "center", minHeight: 48 },
  linkFocused: { borderColor: "#1684F7", borderWidth: 1.5 },
  linkText: { color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 12, textDecorationLine: "underline" },
  secondaryAction: { alignItems: "center", borderRadius: 9, height: 48, justifyContent: "center", marginTop: 10 },
  secondaryActionFocused: { borderColor: "#1684F7", borderWidth: 1.5 },
  secondaryActionText: { color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 14 },
  socials: { gap: 8 },
  social: { alignItems: "center", borderRadius: 10, flexDirection: "row", height: 54, justifyContent: "center" },
  apple: { backgroundColor: "#000000" },
  brandIcon: { height: 24, left: 16, position: "absolute", width: 24 },
  icon: { left: 16, position: "absolute" },
  socialText: { color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 15 },
});
