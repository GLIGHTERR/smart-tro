import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/auth/AuthProvider";
import { RootNavigator } from "@/navigation/RootNavigator";
import { AppErrorBoundary } from "@/startup/AppErrorBoundary";

export default function App() {
  return <AppErrorBoundary><SafeAreaProvider><AuthProvider><StatusBar barStyle="dark-content" /><RootNavigator /></AuthProvider></SafeAreaProvider></AppErrorBoundary>;
}
