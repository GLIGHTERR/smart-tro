import { Button, InputItem, NoticeBar, Provider, Toast } from "@ant-design/react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Modal as NativeModal, Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { PilotButtonProps, PilotDialogProps, PilotFieldProps, PilotToastEvent } from "./types";

export function PilotProvider({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>;
}

export function PilotButton({ label, onPress, disabled, testID }: PilotButtonProps) {
  return <Button testID={testID} disabled={disabled} onPress={onPress}>{label}</Button>;
}

export function PilotField({ label, value, onChange, error, keyboardType, testID }: PilotFieldProps) {
  return <View><InputItem testID={testID} accessibilityLabel={label} value={value} onChange={onChange} type={keyboardType} error={Boolean(error)}>{label}</InputItem>{error ? <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{error}</Text> : null}</View>;
}

export function PilotAlert({ message }: { message: string }) {
  return <View accessibilityRole="alert"><NoticeBar marqueeProps={{ play: false }}>Error</NoticeBar><Text>{message}</Text></View>;
}

export function PilotDialog({ visible, title, message, onClose, closeTestID }: PilotDialogProps) {
  const content = useRef<View>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const setContent = useCallback((node: View | null) => {
    content.current = node;
    if (visible && Platform.OS === "web") {
      previousFocus.current = document.activeElement as HTMLElement | null;
      (node as unknown as HTMLElement | null)?.querySelector<HTMLElement>("button")?.focus();
    }
  }, [visible]);
  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;
    const previous = previousFocus.current;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      const button = (content.current as unknown as HTMLElement | null)?.querySelector<HTMLElement>("button");
      if (event.key === "Tab" && button) { event.preventDefault(); button.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); previous?.focus(); previousFocus.current = null; };
  }, [visible, onClose]);
  const dialog = <View ref={setContent} role="dialog" aria-modal accessibilityViewIsModal accessibilityLabel={title} style={styles.dialogContent}>
    <Text style={styles.dialogTitle}>{title}</Text><Text style={styles.dialogMessage}>{message}</Text><PilotButton testID={closeTestID} label="Close" onPress={onClose} />
  </View>;
  if (Platform.OS === "web") {
    if (!visible) return null;
    return <View accessibilityLabel="Dialog mask" style={styles.webBackdrop}><View style={styles.webDialog}>{dialog}</View></View>;
  }
  // React Native suppresses BackHandler events while a native Modal is open.
  // onRequestClose is the Android Back callback and avoids Ant's portal handler.
  return <NativeModal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.nativeBackdrop}><View style={styles.nativeDialog}>{dialog}</View></View></NativeModal>;
}

export const PILOT_TOAST_DURATION_MS = 5000;
function ToastContent({ message }: { message: string }) {
  const { width } = useWindowDimensions();
  return <View role="status" accessibilityLiveRegion="polite" style={{ maxWidth: Math.max(width - 48, 1) }}><Text style={{ color: "#FFFFFF" }}>{message}</Text></View>;
}

export function PilotToast({ event, onConsume }: { event?: PilotToastEvent; onConsume: (id: string) => void }) {
  const consumed = useRef(new Set<string>());
  const [active, setActive] = useState<PilotToastEvent>();
  useEffect(() => {
    if (!event || consumed.current.has(event.id)) return;
    consumed.current.add(event.id);
    setActive(event);
    onConsume(event.id);
  }, [event, onConsume]);
  useEffect(() => {
    if (!active) return;
    const key = Toast.show({ content: <ToastContent message={active.message} />, duration: 0, mask: false });
    if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(active.message);
    const timer = setTimeout(() => setActive(undefined), PILOT_TOAST_DURATION_MS);
    return () => { clearTimeout(timer); Toast.remove(key); };
  }, [active]);
  return null;
}

const styles = StyleSheet.create({
  fieldError: { color: "#B42318", fontWeight: "600", marginTop: 4 },
  dialogContent: { gap: 16 },
  dialogTitle: { fontSize: 20, fontWeight: "700" },
  dialogMessage: { fontSize: 16, lineHeight: 22 },
  webBackdrop: { alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.45)", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0, zIndex: 1 },
  webDialog: { backgroundColor: "#FFFFFF", borderRadius: 12, maxWidth: 360, padding: 24, width: "86%" },
  nativeBackdrop: { alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.45)", flex: 1, justifyContent: "center", padding: 24 },
  nativeDialog: { backgroundColor: "#FFFFFF", borderRadius: 12, maxWidth: 360, padding: 24, width: "100%" },
});
