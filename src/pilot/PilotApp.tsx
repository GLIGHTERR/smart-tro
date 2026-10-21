import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackScreenProps } from "@react-navigation/native-stack";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { PilotAlert, PilotButton, PilotDialog, PilotField, PilotProvider, PilotToast, type PilotToastEvent } from "@/ui";
import interactionContract from "./interaction-contract.json";

type Routes = { Home: undefined; Next: undefined };
const Stack = createNativeStackNavigator<Routes>();
const ToastContext = createContext<((message: string) => void) | undefined>(undefined);
const longMessage = "The saved changes remain available while you continue navigating. ".repeat(4);
const baseSha = process.env.EXPO_PUBLIC_PILOT_BASE_SHA ?? "not-recorded";
const previewSha = process.env.EXPO_PUBLIC_BUILD_SHA ?? "not-recorded";

export function PilotHome({ navigation }: NativeStackScreenProps<Routes, "Home">) {
  const [value, setValue] = useState("");
  const [showError, setShowError] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [visible, setVisible] = useState(false);
  const close = useCallback(() => setVisible(false), []);
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error("Pilot toast provider is required");
  return <SafeAreaView style={{ flex: 1 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16 }}>
    <Text accessibilityRole="header">G1 UI pilot</Text><Text>QA preview only - no API or production-data actions</Text><Text accessibilityLabel="Pilot provenance">Base merge: {baseSha}{"\n"}QA enablement revision: {previewSha}{"\n"}EXPO_PUBLIC_UI_PILOT=true</Text><Text testID={interactionContract.page1}>Page 1</Text>
    <Text>Validate tests field feedback only. A valid value clears the single required-field message.</Text>
    <PilotField testID={interactionContract.nameInput} label="Name" value={value} onChange={(nextValue) => { setValue(nextValue); if (nextValue.trim()) setShowError(false); }} error={showError ? "Name is required" : undefined} />
    <PilotButton testID={interactionContract.validate} label="Validate" onPress={() => setShowError(true)} />
    <Text>Show persistent alert demonstrates a separate business or system message.</Text>
    {showAlert ? <PilotAlert message="The service is temporarily unavailable. This alert remains until dismissed." /> : null}
    <PilotButton label="Show persistent alert" onPress={() => setShowAlert(true)} />
    {showAlert ? <PilotButton label="Dismiss persistent alert" onPress={() => setShowAlert(false)} /> : null}
    <PilotButton testID={interactionContract.disabled} label="Disabled" disabled onPress={() => {}} />
    <PilotButton testID={interactionContract.openDialog} label="Open dialog" onPress={() => setVisible(true)} />
    <PilotButton testID={interactionContract.showToast} label="Show toast" onPress={() => showToast("Saved")} />
    <PilotButton testID={interactionContract.showLongToast} label="Show long toast" onPress={() => showToast(longMessage)} />
    <Text>Show toast and navigate verifies that a one-shot success message remains visible on Page 2 and closes after about five seconds.</Text>
    <PilotButton testID={interactionContract.showToastAndNavigate} label="Show toast and navigate" onPress={() => { showToast("Saved while navigating"); navigation.navigate("Next"); }} />
    <PilotDialog closeTestID={interactionContract.closeDialog} visible={visible} title="Pilot dialog" message="Your input remains unchanged." onClose={close} />
  </ScrollView></SafeAreaView>;
}

function Next({ navigation }: NativeStackScreenProps<Routes, "Next">) {
  return <SafeAreaView><Text testID={interactionContract.page2}>Page 2</Text><PilotButton testID={interactionContract.goBack} label="Go back" onPress={() => navigation.goBack()} /></SafeAreaView>;
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
