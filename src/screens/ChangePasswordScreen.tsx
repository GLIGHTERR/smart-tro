import { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Dialog, FormPasswordField } from "@/ui";
import { colors, radius } from "@/theme/tokens";
import { emptyChangePasswordForm, isChangePasswordDirty, validateChangePassword, visibleChangePasswordErrors, type ChangePasswordForm } from "./changePasswordModel";

type ReviewResult = "success" | "invalid-current" | "session" | "unavailable";
type NavigationAction = { type: string };
type ChangePasswordNavigation = { addListener: (event: "beforeRemove", listener: (event: { preventDefault: () => void; data: { action: NavigationAction } }) => void) => () => void; dispatch: (action: NavigationAction) => void };
export type ChangePasswordProps = { onExit: () => void; onSuccess: () => void; onSessionExpired: () => void; navigation?: ChangePasswordNavigation; reviewResult?: ReviewResult };

// This screen deliberately stops at the presentation boundary; G3 replaces this deterministic review result with the approved API.
export function ChangePasswordScreen({ onExit, onSuccess, onSessionExpired, navigation, reviewResult = "success" }: ChangePasswordProps) {
  const [form, setForm] = useState<ChangePasswordForm>(emptyChangePasswordForm);
  const [submitting, setSubmitting] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [touched, setTouched] = useState<Partial<Record<keyof ChangePasswordForm, boolean>>>({});
  const [visible, setVisible] = useState<Record<keyof ChangePasswordForm, boolean>>({ currentPassword: false, newPassword: false, confirmation: false });
  const formRef = useRef(form); const submittingRef = useRef(submitting); const inFlight = useRef(false); const pendingAction = useRef<NavigationAction | null>(null); const replaying = useRef(false);
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
  const submit = async () => {
    if (!valid || submitting || inFlight.current) return;
    inFlight.current = true; setSubmitting(true); setNotice(undefined);
    await Promise.resolve();
    if (reviewResult === "session") { clear(); onSessionExpired(); }
    else if (reviewResult === "invalid-current") { setForm((value) => ({ ...value, currentPassword: "" })); setNotice("Mật khẩu hiện tại không đúng. Vui lòng thử lại."); }
    else if (reviewResult === "unavailable") setNotice("Chưa thể xác nhận kết quả thay đổi. Vui lòng thử lại sau.");
    else { clear(); onSuccess(); }
    inFlight.current = false; setSubmitting(false);
  };
  return <SafeAreaView edges={["top", "left", "right", "bottom"]} style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined} style={styles.flex}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text accessibilityRole="header" style={styles.title}>Đổi mật khẩu</Text><Text style={styles.intro}>Tạo mật khẩu mới để bảo vệ tài khoản của bạn.</Text><FormPasswordField disabled={submitting} error={visibleErrors.currentPassword} label="Mật khẩu hiện tại" maxLength={128} onBlur={() => touch("currentPassword")} onChangeText={(currentPassword) => setForm((value) => ({ ...value, currentPassword }))} onTogglePassword={() => setVisible((value) => ({ ...value, currentPassword: !value.currentPassword }))} passwordVisible={visible.currentPassword} required value={form.currentPassword} /><FormPasswordField disabled={submitting} error={visibleErrors.newPassword} hint="8-128 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt." label="Mật khẩu mới" maxLength={128} onBlur={() => touch("newPassword")} onChangeText={(newPassword) => setForm((value) => ({ ...value, newPassword }))} onTogglePassword={() => setVisible((value) => ({ ...value, newPassword: !value.newPassword }))} passwordVisible={visible.newPassword} required value={form.newPassword} /><FormPasswordField disabled={submitting} error={visibleErrors.confirmation} label="Xác nhận mật khẩu mới" maxLength={128} onBlur={() => touch("confirmation")} onChangeText={(confirmation) => setForm((value) => ({ ...value, confirmation }))} onTogglePassword={() => setVisible((value) => ({ ...value, confirmation: !value.confirmation }))} passwordVisible={visible.confirmation} required value={form.confirmation} />{notice ? <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}</ScrollView><View style={styles.actions}><Button accessibilityLabel="Hủy đổi mật khẩu" disabled={submitting} label="Hủy" onPress={requestExit} tone="secondary" /><Button accessibilityLabel="Đổi mật khẩu" disabled={!valid || !dirty || submitting} label="Đổi mật khẩu" loading={submitting} onPress={() => { void submit(); }} /></View></KeyboardAvoidingView>{discardOpen ? <Dialog visible title="Hủy đổi mật khẩu?" message="Thao tác đổi mật khẩu chưa hoàn tất. Bạn có chắc muốn hủy?" onDismiss={() => setDiscardOpen(false)}><Button label="Tiếp tục chỉnh sửa" onPress={() => setDiscardOpen(false)} tone="secondary" /><Button label="Hủy đổi mật khẩu" onPress={discard} tone="danger" /></Dialog> : null}</SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { backgroundColor: "#FFF2DB", flex: 1 }, flex: { flex: 1 }, content: { flexGrow: 1, padding: 24, paddingBottom: 32 }, title: { color: "#2E2E2E", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 28, lineHeight: 36 }, intro: { color: "#675440", fontFamily: "BeVietnamPro_400Regular", fontSize: 15, lineHeight: 23, marginBottom: 28, marginTop: 12 }, notice: { backgroundColor: "#FBE2E2", borderRadius: radius.sm, color: colors.danger, fontFamily: "BeVietnamPro_600SemiBold", lineHeight: 22, padding: 14 }, actions: { backgroundColor: "#FFFFFF", borderTopColor: "#E6CDA8", borderTopWidth: 1, flexDirection: "row", gap: 12, padding: 16 } });
