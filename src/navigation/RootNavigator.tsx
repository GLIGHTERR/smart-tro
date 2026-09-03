import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import { Button, ScreenState } from "@/ui/components";
import { colors, spacing } from "@/theme/tokens";
import { AuthScreen } from "@/screens/AuthScreen";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function Placeholder({ title, copy }: { title: string; copy: string }) { return <SafeAreaView style={styles.page}><Text style={styles.title}>{title}</Text><Text style={styles.copy}>{copy}</Text></SafeAreaView>; }
function Account() { const { signOut } = useAuth(); return <SafeAreaView style={styles.page}><Text style={styles.title}>Account</Text><Text style={styles.copy}>Your secure renter session is active.</Text><Button label="Sign out" onPress={() => void signOut()} /></SafeAreaView>; }
function AppTabs() { return <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}><Tabs.Screen name="Home">{() => <Placeholder title="Welcome home" copy="Search and booking features will be delivered by GLI-15." />}</Tabs.Screen><Tabs.Screen name="Saved">{() => <Placeholder title="Saved" copy="Your saved homes will appear here." />}</Tabs.Screen><Tabs.Screen name="Account" component={Account} /></Tabs.Navigator>; }

export function RootNavigator() {
  const { token, isRestoring } = useAuth();
  if (isRestoring) return <ScreenState kind="loading" />;
  return <NavigationContainer>{token ? <AppTabs /> : <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="Auth" component={AuthScreen} /></Stack.Navigator>}</NavigationContainer>;
}
const styles = StyleSheet.create({ page: { backgroundColor: colors.canvas, flex: 1, gap: spacing.md, justifyContent: "center", padding: spacing.lg }, title: { color: colors.ink, fontSize: 30, fontWeight: "800" }, copy: { color: colors.muted, fontSize: 16, lineHeight: 24 } });
