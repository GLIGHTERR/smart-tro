import { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Dialog, FormPasswordField } from "@/ui";
import { colors, radius } from "@/theme/tokens";
import { emptyChangePasswordForm, isChangePasswordDirty, validateChangePassword, visibleChangePasswordErrors, type ChangePasswordForm } from "./changePasswordModel";
import { ChangePasswordGatewayError, createConfiguredChangePasswordGateway, type ChangePasswordGateway } from "./changePasswordGateway";

type NavigationAction = { type: string };
type ChangePasswordNavigation = { addListener: (event: "beforeRemove", listener: (event: { preventDefault: () => void; data: { action: NavigationAction } }) => void) => () => void; dispatch: (action: NavigationAction) => void };
export type ChangePasswordProps = { onExit: () => void; onSuccess: () => void; onSessionExpired: () => void; sessionKey: string; gateway?: ChangePasswordGateway; navigation?: ChangePasswordNavigation; createIdempotencyKey?: () => string };

function defaultIdempotencyKey(): string {
  return `change-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

function noticeFor(error: ChangePasswordGatewayError): string {
  if (error.code === "INVALID_CURRENT_PASSWORD") return "Mật khẩu hiện tại không đúng. Vui lòng thử lại.";
  if (error.code === "VALIDATION_ERROR") return "Thông tin mật khẩu chưa hợp lệ. Vui lòng kiểm tra lại.";
  if (error.code === "RATE_LIMITED") return "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.";
  if (error.code === "CONFLICT") return "Mật khẩu vừa được thay đổi. Vui lòng kiểm tra lại trước khi thử tiếp.";
  return "Chưa thể xác nhận kết quả thay đổi. Vui lòng thử lại sau.";
}

export function ChangePasswordScreen({ onExit, onSuccess, onSessionExpired, sessionKey, gateway, navigation, createIdempotencyKey = defaultIdempotencyKey }: ChangePasswordProps) {
  const [form, setForm] = useState<ChangePasswordForm>(emptyChangePasswordForm);
  const [submitting, setSubmitting] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [touched, setTouched] = useState<Partial<Record<keyof ChangePasswordForm, boolean>>>({});
  const [visible, setVisible] = useState<Record<keyof ChangePasswordForm, boolean>>({ currentPassword: false, newPassword: false, confirmation: false });
  const passwordGateway = useMemo(() => gateway ?? createConfiguredChangePasswordGateway(), [gateway]);
  const formRef = useRef(form); const submittingRef = useRef(submitting); const inFlight = useRef(false); const pendingAction = useRef<NavigationAction | null>(null); const replaying = useRef(false);
  const idempotencyKey = useRef<string | undefined>(undefined);
  const errors = useMemo(() => validateChangePassword(form), [form]);
  const visibleErrors = useMemo(() => visibleChangePasswordErrors(form, touched), [form, touched]);
  const dirty = isChangePasswordDirty(form);
  const valid = Object.keys(errors).length === 0;
  useEffect(() => { formRef.current = form; submittingRef.current = submitting; }, [form, submitting]);
  const clear = () => { setForm(emptyChangePasswordForm()); setTouched({}); setVisible({ currentPassword: false, newPassword: false, confirmation: false }); setNotice(undefined); };
  const touch = (field: keyof ChangePasswordForm) => setTouched((current) => current[field] ? current : { ...current, [field]: true });
  const requestExit = () => { if (submitting) return; if (isChangePasswordDirty(form)) setDiscardOpen(true); else onExit(); };
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { if (submittingRef.current) return true; if (isChangePasswordDirty(formRef.current)) { setDiscardOpen(true); return true; } return false; });
    return () => subscription.remove();
  }, []);
  useEffect(() => navigation?.addListener("beforeRemove", (event) => { if (replaying.current || submittingRef.current || !isChangePasswordDirty(formRef.current)) return; event.preventDefault(); pendingAction.current = event.data.action; setDiscardOpen(true); }), [navigation]);
  const discard = () => { const action = pendingAction.current; pendingAction.current = null; clear(); setDiscardOpen(false); replaying.current = true; if (action && navigation) navigation.dispatch(action); else onExit(); setTimeout(() => { replaying.current = false; }, 0); };
  const updateField = (field: keyof ChangePasswordForm, value: string) => {
    idempotencyKey.current = undefined;
    setForm((current) => ({ ...current, [field]: value }));
  };
  const submit = async () => {
    if (!valid || submitting || inFlight.current) return;
    inFlight.current = true; setSubmitting(true); setNotice(undefined);
    try {
      const key = idempotencyKey.current ?? createIdempotencyKey();
      idempotencyKey.current = key;
      await passwordGateway.change(sessionKey, { ...form, idempotencyKey: key });
      clear();
      idempotencyKey.current = undefined;
      onSuccess();
    } catch (cause) {
      if (cause instanceof ChangePasswordGatewayError && cause.code === "INVALID_SESSION") {
        clear();
        onSessionExpired();
      } else {
        setNotice(noticeFor(cause instanceof ChangePasswordGatewayError ? cause : new ChangePasswordGatewayError("UNAVAILABLE")));
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };
  return <SafeAreaView edges={["top", "left", "right", "bottom"]} style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined} style={styles.flex}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text accessibilityRole="header" style={styles.title}>Đổi mật khẩu</Text><Text style={styles.intro}>Tạo mật khẩu mới để bảo vệ tài khoản của bạn.</Text><FormPasswordField disabled={submitting} error={visibleErrors.currentPassword} label="Mật khẩu hiện tại" maxLength={128} onBlur={() => touch("currentPassword")} onChangeText={(currentPassword) => updateField("currentPassword", currentPassword)} onTogglePassword={() => setVisible((value) => ({ ...value, currentPassword: !value.currentPassword }))} passwordVisible={visible.currentPassword} required value={form.currentPassword} /><FormPasswordField disabled={submitting} error={visibleErrors.newPassword} hint="8-128 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt." label="Mật khẩu mới" maxLength={128} onBlur={() => touch("newPassword")} onChangeText={(newPassword) => updateField("newPassword", newPassword)} onTogglePassword={() => setVisible((value) => ({ ...value, newPassword: !value.newPassword }))} passwordVisible={visible.newPassword} required value={form.newPassword} /><FormPasswordField disabled={submitting} error={visibleErrors.confirmation} label="Xác nhận mật khẩu mới" maxLength={128} onBlur={() => touch("confirmation")} onChangeText={(confirmation) => updateField("confirmation", confirmation)} onTogglePassword={() => setVisible((value) => ({ ...value, confirmation: !value.confirmation }))} passwordVisible={visible.confirmation} required value={form.confirmation} />{notice ? <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}</ScrollView><View style={styles.actions}><Button accessibilityLabel="Hủy đổi mật khẩu" disabled={submitting} label="Hủy" onPress={requestExit} tone="secondary" /><Button accessibilityLabel="Đổi mật khẩu" disabled={!valid || !dirty || submitting} label="Đổi mật khẩu" loading={submitting} onPress={() => { void submit(); }} /></View></KeyboardAvoidingView>{discardOpen ? <Dialog visible title="Hủy đổi mật khẩu?" message="Thao tác đổi mật khẩu chưa hoàn tất. Bạn có chắc muốn hủy?" onDismiss={() => setDiscardOpen(false)}><Button label="Tiếp tục chỉnh sửa" onPress={() => setDiscardOpen(false)} tone="secondary" /><Button label="Hủy đổi mật khẩu" onPress={discard} tone="danger" /></Dialog> : null}</SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { backgroundColor: "#FFF2DB", flex: 1 }, flex: { flex: 1 }, content: { flexGrow: 1, padding: 24, paddingBottom: 32 }, title: { color: "#2E2E2E", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 28, lineHeight: 36 }, intro: { color: "#675440", fontFamily: "BeVietnamPro_400Regular", fontSize: 15, lineHeight: 23, marginBottom: 28, marginTop: 12 }, notice: { backgroundColor: "#FBE2E2", borderRadius: radius.sm, color: colors.danger, fontFamily: "BeVietnamPro_600SemiBold", lineHeight: 22, padding: 14 }, actions: { backgroundColor: "#FFFFFF", borderTopColor: "#E6CDA8", borderTopWidth: 1, flexDirection: "row", gap: 12, padding: 16 } });
