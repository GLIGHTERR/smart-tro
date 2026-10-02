import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Alert } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import { ScreenState } from "@/ui/components";
import { AuthScreen } from "@/screens/AuthScreen";
import { HomeScreen } from "@/screens/HomeScreen";

const Stack = createNativeStackNavigator();
const isWebReview = process.env.EXPO_PUBLIC_HOME_REVIEW === "true";

function AuthenticatedHome() { const { token } = useAuth(); return <HomeScreen sessionKey={token ?? ""} onNavigate={(destination) => Alert.alert("Điều hướng", destination)} />; }

export function RootNavigator() {
  const { token, isRestoring } = useAuth();
  if (isRestoring) return <ScreenState kind="loading" />;
  return <NavigationContainer>{token || isWebReview ? <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="Home" component={AuthenticatedHome} /></Stack.Navigator> : <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="Auth" component={AuthScreen} /></Stack.Navigator>}</NavigationContainer>;
}
