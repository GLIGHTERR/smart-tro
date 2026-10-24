import { useEffect, useRef, useState } from "react";
import { Toast as AntToast } from "@ant-design/react-native";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const SUCCESS_TOAST_DURATION_MS = 5000;
export type ToastEvent = { id: string; message: string; kind?: "success" };
export type SuccessToastEvent = ToastEvent;

type ToastProps = {
  event?: ToastEvent;
  onConsume: (eventId: string) => void;
};

export function getResponsiveToastDimensions(viewportWidth: number, insets: { left: number; right: number }) {
  const availableWidth = Math.max(viewportWidth - insets.left - insets.right - 40, 0);
  const width = Math.min(availableWidth, 480);
  return { minWidth: Math.min(280, width), width };
}

function ToastContent({ message }: { message: string }) {
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const dimensions = getResponsiveToastDimensions(viewportWidth, insets);

  return <View accessibilityLiveRegion="polite" role="status" pointerEvents="none" style={[styles.toast, dimensions]}><Text style={styles.text}>{message}</Text></View>;
}

// This owns UC feedback semantics so the UI-library workstream can replace only the rendering layer.
// The app has one mounted Toast owner; event ids prevent route transitions from replaying feedback.
export function Toast({ event, onConsume }: ToastProps) {
  const consumedEventIds = useRef(new Set<string>());
  const [activeEvent, setActiveEvent] = useState<ToastEvent | null>(null);

  useEffect(() => {
    if (!event || consumedEventIds.current.has(event.id)) return;
    consumedEventIds.current.add(event.id);
    setActiveEvent(event);
    onConsume(event.id);
  }, [event, onConsume]);

  useEffect(() => {
    if (!activeEvent) return;
    const key = AntToast.show({ content: <ToastContent message={activeEvent.message} />, duration: 0, mask: false, position: "bottom" });
    const timeout = setTimeout(() => setActiveEvent(null), SUCCESS_TOAST_DURATION_MS);
    return () => { clearTimeout(timeout); AntToast.remove(key); };
  }, [activeEvent]);

  return null;
}

export const SuccessToastAdapter = Toast;

const styles = StyleSheet.create({
  toast: { alignSelf: "center", backgroundColor: "#E2F3E7", borderColor: "#2D7A46", borderRadius: 8, borderWidth: 1, elevation: 6, padding: 14, shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 6 },
  text: { color: "#176B3A", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 14, textAlign: "center" },
});
