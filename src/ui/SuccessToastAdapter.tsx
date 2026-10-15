import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export const SUCCESS_TOAST_DURATION_MS = 5000;
export type SuccessToastEvent = { id: string; message: string };

type SuccessToastAdapterProps = {
  event?: SuccessToastEvent;
  onConsume: (eventId: string) => void;
};

// This owns UC feedback semantics so the UI-library workstream can replace only the rendering layer.
export function SuccessToastAdapter({ event, onConsume }: SuccessToastAdapterProps) {
  const consumedEventIds = useRef(new Set<string>());
  const [activeEvent, setActiveEvent] = useState<SuccessToastEvent | null>(null);

  useEffect(() => {
    if (!event || consumedEventIds.current.has(event.id)) return;
    consumedEventIds.current.add(event.id);
    setActiveEvent(event);
    onConsume(event.id);
  }, [event, onConsume]);

  useEffect(() => {
    if (!activeEvent) return;
    const timeout = setTimeout(() => setActiveEvent(null), SUCCESS_TOAST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [activeEvent]);

  if (!activeEvent) return null;
  return <View accessibilityLiveRegion="polite" role="status" pointerEvents="none" style={styles.toast}><Text style={styles.text}>{activeEvent.message}</Text></View>;
}

const styles = StyleSheet.create({
  toast: { backgroundColor: "#E2F3E7", borderColor: "#2D7A46", borderRadius: 8, borderWidth: 1, bottom: 20, elevation: 6, left: 20, padding: 14, position: "absolute", right: 20, shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 6 },
  text: { color: "#176B3A", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 14, textAlign: "center" },
});
