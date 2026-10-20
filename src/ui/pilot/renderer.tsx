import { Button, InputItem, Modal, NoticeBar, Provider, Toast } from "@ant-design/react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, BackHandler, Platform, Text, useWindowDimensions, View } from "react-native";
import type { PilotButtonProps, PilotDialogProps, PilotFieldProps, PilotToastEvent } from "./types";

export function PilotProvider({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>;
}

export function PilotButton({ label, onPress, disabled }: PilotButtonProps) {
  return <Button disabled={disabled} onPress={onPress}>{label}</Button>;
}

export function PilotField({ label, value, onChange, error, keyboardType }: PilotFieldProps) {
  return <View><InputItem accessibilityLabel={label} value={value} onChange={onChange} type={keyboardType} error={Boolean(error)}>{label}</InputItem>{error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}</View>;
}

export function PilotAlert({ message }: { message: string }) {
  return <View accessibilityRole="alert"><NoticeBar marqueeProps={{ play: false }}>Error</NoticeBar><Text>{message}</Text></View>;
}

export function PilotDialog({ visible, title, message, onClose }: PilotDialogProps) {
  const content = useRef<View>(null);
  const setContent = useCallback((node: View | null) => {
    content.current = node;
    if (visible && Platform.OS === "web") {
      (node as unknown as HTMLElement | null)?.querySelector<HTMLElement>("button")?.focus();
    }
  }, [visible]);
  useEffect(() => {
    if (!visible || Platform.OS === "web") return;
    // Ant Design's modal does not reliably consume Android Back on this stack.
    // Consume it here so React Native does not fall through to the activity.
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onClose]);
  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;
    const previous = document.activeElement as HTMLElement | null;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      const button = (content.current as unknown as HTMLElement | null)?.querySelector<HTMLElement>("button");
      if (event.key === "Tab" && button) { event.preventDefault(); button.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); previous?.focus(); };
  }, [visible, onClose]);
  return <Modal visible={visible} onClose={onClose} onRequestClose={() => { onClose(); return true; }} maskClosable={false}>
    <View ref={setContent} role="dialog" aria-modal accessibilityViewIsModal accessibilityLabel={title}>
      <Text>{title}</Text><Text>{message}</Text><PilotButton label="Close" onPress={onClose} />
    </View>
  </Modal>;
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
