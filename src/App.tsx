import { StatusBar } from "react-native";
import { AuthProvider } from "@/auth/AuthProvider";
import { RootNavigator } from "@/navigation/RootNavigator";

export default function App() {
  return <AuthProvider><StatusBar barStyle="dark-content" /><RootNavigator /></AuthProvider>;
}
