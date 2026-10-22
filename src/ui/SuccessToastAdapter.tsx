import { useEffect, useRef, useState } from "react";
import { Toast as AntToast } from "@ant-design/react-native";
import { StyleSheet, Text, View } from "react-native";

export const SUCCESS_TOAST_DURATION_MS = 5000;
export type ToastEvent = { id: string; message: string; kind?: "success" };
export type SuccessToastEvent = ToastEvent;

type ToastProps = {
  event?: ToastEvent;
  onConsume: (eventId: string) => void;
};

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
    const key = AntToast.show({ content: <View accessibilityLiveRegion="polite" role="status" pointerEvents="none" style={styles.toast}><Text style={styles.text}>{activeEvent.message}</Text></View>, duration: 0, mask: false, position: "bottom" });
    const timeout = setTimeout(() => setActiveEvent(null), SUCCESS_TOAST_DURATION_MS);
    return () => { clearTimeout(timeout); AntToast.remove(key); };
  }, [activeEvent]);

  return null;
}

export const SuccessToastAdapter = Toast;

const styles = StyleSheet.create({
  toast: { backgroundColor: "#E2F3E7", borderColor: "#2D7A46", borderRadius: 8, borderWidth: 1, bottom: 20, elevation: 6, left: 20, padding: 14, position: "absolute", right: 20, shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 6 },
  text: { color: "#176B3A", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 14, textAlign: "center" },
});
