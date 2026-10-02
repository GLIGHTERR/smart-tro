import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BeVietnamPro_400Regular } from "@expo-google-fonts/be-vietnam-pro/400Regular";
import { BeVietnamPro_600SemiBold } from "@expo-google-fonts/be-vietnam-pro/600SemiBold";
import { useFonts } from "@expo-google-fonts/be-vietnam-pro/useFonts";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/auth/AuthProvider";
import { RootNavigator } from "@/navigation/RootNavigator";
import { AppErrorBoundary } from "@/startup/AppErrorBoundary";

export default function App() {
  const [fontsLoaded] = useFonts({ BeVietnamPro_400Regular, BeVietnamPro_600SemiBold, ...FontAwesome.font });
  if (!fontsLoaded) return <View style={styles.loading}><ActivityIndicator color="#FFFFFF" /></View>;
  return <AppErrorBoundary><SafeAreaProvider><AuthProvider><StatusBar barStyle="light-content" /><RootNavigator /></AuthProvider></SafeAreaProvider></AppErrorBoundary>;
}

const styles = StyleSheet.create({ loading: { alignItems: "center", backgroundColor: "#FF9800", flex: 1, justifyContent: "center" } });
