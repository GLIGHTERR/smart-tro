import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BeVietnamPro_400Regular } from "@expo-google-fonts/be-vietnam-pro/400Regular";
import { BeVietnamPro_600SemiBold } from "@expo-google-fonts/be-vietnam-pro/600SemiBold";
import { useFonts } from "@expo-google-fonts/be-vietnam-pro/useFonts";
import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/auth/AuthProvider";
import { RootNavigator } from "@/navigation/RootNavigator";
import { AppErrorBoundary } from "@/startup/AppErrorBoundary";
import { FONT_STARTUP_TIMEOUT_MS, getFontStartupDiagnostic, getFontStartupState } from "@/startup/fontState";

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ BeVietnamPro_400Regular, BeVietnamPro_600SemiBold, ...FontAwesome.font });
  const [fontTimedOut, setFontTimedOut] = useState(false);
  const isDebugBuild = process.env.EXPO_PUBLIC_DEBUG_REVISION === "true";
  useEffect(() => { if (fontsLoaded || fontError) return; const timeout = setTimeout(() => setFontTimedOut(true), FONT_STARTUP_TIMEOUT_MS); return () => clearTimeout(timeout); }, [fontsLoaded, fontError]);
  useEffect(() => { const diagnostic = getFontStartupDiagnostic(fontError, fontTimedOut, isDebugBuild); if (diagnostic) console.warn(diagnostic); }, [fontError, fontTimedOut, isDebugBuild]);
  if (getFontStartupState(fontsLoaded, fontError, fontTimedOut) === "loading") return <View style={styles.loading}><ActivityIndicator color="#FFFFFF" /></View>;
  return <AppErrorBoundary><SafeAreaProvider><AuthProvider><StatusBar barStyle="light-content" /><RootNavigator /></AuthProvider></SafeAreaProvider></AppErrorBoundary>;
}

const styles = StyleSheet.create({ loading: { alignItems: "center", backgroundColor: "#FF9800", flex: 1, justifyContent: "center" } });
