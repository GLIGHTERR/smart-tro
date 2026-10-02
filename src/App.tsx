import { useFonts } from "expo-font";
import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/auth/AuthProvider";
import { RootNavigator } from "@/navigation/RootNavigator";
import { AppErrorBoundary } from "@/startup/AppErrorBoundary";
import { FONT_STARTUP_TIMEOUT_MS, getFontStartupDiagnostic, getFontStartupState } from "@/startup/fontState";

export default function App() {
  // Native builds embed these TTFs through the expo-font config plugin; this also
  // verifies the registered families before any branded screen is rendered.
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_400Regular: require("../assets/fonts/BeVietnamPro_400Regular.ttf"),
    BeVietnamPro_600SemiBold: require("../assets/fonts/BeVietnamPro_600SemiBold.ttf"),
  });
  const [fontTimedOut, setFontTimedOut] = useState(false);
  const isDebugBuild = process.env.EXPO_PUBLIC_DEBUG_REVISION === "true";
  useEffect(() => { if (fontsLoaded || fontError) return; const timeout = setTimeout(() => setFontTimedOut(true), FONT_STARTUP_TIMEOUT_MS); return () => clearTimeout(timeout); }, [fontsLoaded, fontError]);
  useEffect(() => { const diagnostic = getFontStartupDiagnostic(fontError, fontTimedOut, isDebugBuild); if (diagnostic) console.warn(diagnostic); }, [fontError, fontTimedOut, isDebugBuild]);
  const fontStartup = getFontStartupState(fontsLoaded, fontError, fontTimedOut);
  if (fontStartup === "loading") return <View style={styles.loading}><ActivityIndicator color="#FFFFFF" /></View>;
  if (fontStartup === "failed") return <View accessibilityRole="alert" style={styles.fontFailure}><Text style={styles.fontFailureTitle}>SmartTrọ cần tải lại</Text><Text style={styles.fontFailureCopy}>Không thể tải phông chữ ứng dụng. Vui lòng đóng và mở lại ứng dụng.</Text></View>;
  return <AppErrorBoundary><SafeAreaProvider><AuthProvider><StatusBar barStyle="light-content" /><RootNavigator /></AuthProvider></SafeAreaProvider></AppErrorBoundary>;
}

const styles = StyleSheet.create({ loading: { alignItems: "center", backgroundColor: "#FF9800", flex: 1, justifyContent: "center" }, fontFailure: { alignItems: "center", backgroundColor: "#FF9800", flex: 1, justifyContent: "center", padding: 32 }, fontFailureTitle: { color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 24, textAlign: "center" }, fontFailureCopy: { color: "#FFFFFF", fontFamily: "BeVietnamPro_400Regular", fontSize: 16, lineHeight: 24, marginTop: 12, textAlign: "center" } });
