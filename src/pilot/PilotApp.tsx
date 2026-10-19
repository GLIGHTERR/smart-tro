import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackScreenProps } from "@react-navigation/native-stack";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { PilotAlert, PilotButton, PilotDialog, PilotField, PilotProvider, PilotToast, type PilotToastEvent } from "@/ui";

type Routes = { Home: undefined; Next: undefined };
const Stack = createNativeStackNavigator<Routes>();
const ToastContext = createContext<((message: string) => void) | undefined>(undefined);
const longMessage = "The saved changes remain available while you continue navigating. ".repeat(4);

export function PilotHome({ navigation }: NativeStackScreenProps<Routes, "Home">) {
  const [value, setValue] = useState("");
  const [showError, setShowError] = useState(false);
  const [visible, setVisible] = useState(false);
  const close = useCallback(() => setVisible(false), []);
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error("Pilot toast provider is required");
  return <SafeAreaView style={{ flex: 1 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16 }}>
    <Text accessibilityRole="header">G1 UI pilot</Text><Text>Page 1</Text>
    <PilotField label="Name" value={value} onChange={setValue} error={showError && !value.trim() ? "Name is required" : undefined} />
    {showError && !value.trim() ? <PilotAlert message="Name is required" /> : null}
    <PilotButton label="Validate" onPress={() => setShowError(true)} />
    <PilotButton label="Disabled" disabled onPress={() => {}} />
    <PilotButton label="Open dialog" onPress={() => setVisible(true)} />
    <PilotButton label="Show toast" onPress={() => showToast("Saved")} />
    <PilotButton label="Show long toast" onPress={() => showToast(longMessage)} />
    <PilotButton label="Navigate" onPress={() => navigation.navigate("Next")} />
    <PilotDialog visible={visible} title="Pilot dialog" message="Your input remains unchanged." onClose={close} />
  </ScrollView></SafeAreaView>;
}

function Next({ navigation }: NativeStackScreenProps<Routes, "Next">) {
  return <SafeAreaView><Text>Page 2</Text><PilotButton label="Go back" onPress={() => navigation.goBack()} /></SafeAreaView>;
}

export default function PilotApp() {
  const [event, setEvent] = useState<PilotToastEvent>();
  const sequence = useRef(0);
  const show = useCallback((message: string) => { sequence.current += 1; setEvent({ id: `pilot-${sequence.current}`, message }); }, []);
  const consume = useCallback((id: string) => setEvent((current) => current?.id === id ? undefined : current), []);
  return <SafeAreaProvider><PilotProvider><ToastContext.Provider value={show}>
    <NavigationContainer><Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="Home" component={PilotHome} /><Stack.Screen name="Next" component={Next} /></Stack.Navigator></NavigationContainer>
    <PilotToast event={event} onConsume={consume} />
  </ToastContext.Provider></PilotProvider></SafeAreaProvider>;
}
