import { getPathFromState, getStateFromPath, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/AuthProvider";
import { ScreenState } from "@/ui/components";
import { AuthScreen } from "@/screens/AuthScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { homeDestinations, type HomeAction } from "@/screens/homeModel";

type RootStackParamList = { Auth: undefined; Home: undefined; Destination: { action: HomeAction } };

const Stack = createNativeStackNavigator<RootStackParamList>();
const isWebReview = process.env.EXPO_PUBLIC_HOME_REVIEW === "true";
const linking = {
  prefixes: [],
  config: { screens: { Home: "", Destination: "destination/:action" } },
  getPathFromState: (state: Parameters<typeof getPathFromState>[0], config: Parameters<typeof getPathFromState>[1]) => `/smart-tro${getPathFromState(state, config)}`,
  getStateFromPath: (path: string, config: Parameters<typeof getStateFromPath>[1]) => getStateFromPath(path.replace(/^\/?smart-tro\/?/, ""), config),
};

function AuthenticatedHome({ navigation }: { navigation: { navigate: (screen: "Destination", params: { action: HomeAction }) => void } }) { const { token } = useAuth(); return <HomeScreen sessionKey={token ?? ""} onNavigate={(action) => navigation.navigate("Destination", { action })} />; }

function DestinationScreen({ navigation, route }: { navigation: { goBack: () => void }; route: { params: { action: HomeAction } } }) {
  const destination = homeDestinations[route.params.action];
  return <SafeAreaView style={styles.safe}><View style={styles.content}><Text accessibilityRole="header" style={styles.title}>{destination}</Text><Text style={styles.copy}>Bạn đã đến điểm điều hướng được chọn từ Trang chủ.</Text><Pressable accessibilityRole="button" accessibilityLabel="Quay lại Trang chủ" onPress={navigation.goBack} style={styles.back}><Text style={styles.backText}>Quay lại Trang chủ</Text></Pressable></View></SafeAreaView>;
}

export function RootNavigator() {
  const { token, isRestoring } = useAuth();
  if (isRestoring) return <ScreenState kind="loading" />;
  return <NavigationContainer linking={linking}>{token || isWebReview ? <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="Home" component={AuthenticatedHome} /><Stack.Screen name="Destination" component={DestinationScreen} /></Stack.Navigator> : <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="Auth" component={AuthScreen} /></Stack.Navigator>}</NavigationContainer>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: "#FFF2DB", flex: 1 },
  content: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
  title: { color: "#2E2E2E", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 24, textAlign: "center" },
  copy: { color: "#5A4632", fontFamily: "BeVietnamPro_400Regular", fontSize: 16, lineHeight: 24, marginTop: 16, textAlign: "center" },
  back: { backgroundColor: "#A84300", borderRadius: 8, marginTop: 28, paddingHorizontal: 20, paddingVertical: 12 },
  backText: { color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold" },
});
