import { Component, type ErrorInfo, type ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenState } from "@/ui/components";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Do not include user data or tokens in startup diagnostics.
    console.error("[startup] unhandled render error", error.name, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <SafeAreaView style={{ flex: 1 }}><ScreenState kind="error" message="SmartTrọ could not start. Please close and reopen the app." onRetry={() => this.setState({ hasError: false })} /></SafeAreaView>;
    }
    return this.props.children;
  }
}
