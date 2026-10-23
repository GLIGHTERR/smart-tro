import { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius } from "@/theme/tokens";
import { Button, Dialog, Field } from "@/ui";
import { createConfiguredProfileGateway, ProfileGatewayError, type ProfileGateway, type ProfileUpdatePayload } from "@/profile/gateway";
import { maskEmail } from "./accountModel";
import { canonicalPhoneFromDomestic, domesticPhoneFromCanonical, isDirty, type EditableProfile, validateEditableProfile } from "./editPersonalInformationModel";

type SaveResult = "success" | "validation" | "retryable" | "session";
type NavigationAction = { type: string };
type EditProfileNavigation = { addListener: (event: "beforeRemove", listener: (event: { preventDefault: () => void; data: { action: NavigationAction } }) => void) => () => void; dispatch: (action: NavigationAction) => void };
export type EditProfileProps = { profile?: EditableProfile; onExit: () => void; onSessionError: () => void; onSaved: (profile: ProfileUpdatePayload["profile"]) => void; sessionKey?: string; gateway?: ProfileGateway; reviewResult?: SaveResult; navigation?: EditProfileNavigation };
const fixture: EditableProfile = { displayName: "Nguyễn Văn A", phone: "+84901234567", email: "nguyen.van.a.renter@example.com" };

export function EditPersonalInformationScreen({ profile = fixture, onExit, onSessionError, onSaved, sessionKey = "", gateway, reviewResult, navigation }: EditProfileProps) {
  const [name, setName] = useState(profile.displayName);
  const [phone, setPhone] = useState(domesticPhoneFromCanonical(profile.phone));
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const stayRef = useRef<View>(null);
  const validation = useMemo(() => validateEditableProfile(name, phone), [name, phone]);
  const dirty = isDirty(profile, name, phone);
  const valid = !validation.nameError && !validation.phoneError;
  const canSave = dirty && valid && !saving;
  const dirtyRef = useRef(dirty);
  const savingRef = useRef(saving);
  const pendingBackAction = useRef<NavigationAction | null>(null);
  const replayingBackAction = useRef(false);
  const saveInFlight = useRef(false);
  const profileGateway = useMemo(() => gateway ?? createConfiguredProfileGateway(), [gateway]);
  useEffect(() => { dirtyRef.current = dirty; savingRef.current = saving; }, [dirty, saving]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (savingRef.current) return true;
      if (dirtyRef.current) { setDialog(true); return true; }
      return false;
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => navigation?.addListener("beforeRemove", (event) => {
    if (replayingBackAction.current || savingRef.current || !dirtyRef.current) return;
    event.preventDefault();
    pendingBackAction.current = event.data.action;
    setDialog(true);
  }), [navigation]);
  const requestExit = () => { if (saving) return; if (dirty) setDialog(true); else onExit(); };
  const stay = () => { pendingBackAction.current = null; setDialog(false); setTimeout(() => stayRef.current?.focus(), 0); };
  const discard = () => {
    const action = pendingBackAction.current;
    pendingBackAction.current = null;
    setDialog(false);
    replayingBackAction.current = true;
    if (action && navigation) navigation.dispatch(action);
    else onExit();
    setTimeout(() => { replayingBackAction.current = false; }, 0);
  };
  const completeSave = (result: ProfileUpdatePayload) => {
    onSaved(result.profile);
  };
  const save = async () => {
    if (!canSave || saveInFlight.current) return;
    saveInFlight.current = true;
    setNotice(null); setSaving(true);
    try {
      if (reviewResult === "validation") throw new ProfileGatewayError("VALIDATION_ERROR");
      if (reviewResult === "retryable") throw new ProfileGatewayError("PROFILE_UNAVAILABLE");
      if (reviewResult === "session") throw new ProfileGatewayError("INVALID_SESSION");
      completeSave(await profileGateway.update(sessionKey, { displayName: validation.name, phone: canonicalPhoneFromDomestic(phone) }));
    } catch (cause) {
      if (cause instanceof ProfileGatewayError && cause.code === "INVALID_SESSION") {
        let sessionWasVerified = false;
        try {
          // A successful authenticated read proves this PATCH rejection was not a lost session.
          await profileGateway.read(sessionKey);
          sessionWasVerified = true;
          completeSave(await profileGateway.update(sessionKey, { displayName: validation.name, phone: canonicalPhoneFromDomestic(phone) }));
          return;
        } catch (verificationCause) {
          if (!sessionWasVerified && verificationCause instanceof ProfileGatewayError && verificationCause.code === "INVALID_SESSION") return onSessionError();
        }
      }
      setNotice({ kind: "error", message: cause instanceof ProfileGatewayError && cause.code === "VALIDATION_ERROR" ? "Một số thông tin chưa hợp lệ. Vui lòng kiểm tra lại." : "Chưa thể lưu thay đổi. Vui lòng thử lại." });
    } finally { saveInFlight.current = false; setSaving(false); }
  };
  return <SafeAreaView edges={["top", "left", "right", "bottom"]} style={styles.safe}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>Cập nhật thông tin cá nhân</Text></View>
        <Text style={styles.intro}>Kiểm tra và cập nhật thông tin liên hệ của bạn.</Text>
        <Field label="Họ và tên" value={name} onChangeText={setName} error={validation.nameError} required autoCapitalize="words" maxLength={240} disabled={saving} />
        <Field label="Số điện thoại" value={phone} onChangeText={setPhone} error={validation.phoneError} keyboardType="phone-pad" hint="Không bắt buộc. Ví dụ: 0901234567" maxLength={10} disabled={saving} />
        <View style={styles.field}><Text style={styles.label}>Email</Text><Text accessibilityLabel="Email chỉ đọc" style={styles.readonly}>{maskEmail(profile.email)}</Text><Text style={styles.hint}>Email không thể chỉnh sửa.</Text></View>
        {notice?.kind === "error" ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.notice, styles.errorNotice]}>{notice.message}</Text> : null}
      </ScrollView>
      <View style={styles.actions}><Button accessibilityLabel="Hủy chỉnh sửa" disabled={saving} label="Hủy" onPress={requestExit} tone="secondary" /><Button accessibilityLabel="Lưu" disabled={!canSave} label="Lưu" loading={saving} onPress={save} /></View>
    </KeyboardAvoidingView>
    {dialog ? <Dialog visible title="Hủy thay đổi?" message="Các thay đổi chưa lưu sẽ bị mất. Bạn có chắc muốn rời khỏi màn hình này?" onDismiss={stay}><Button label="Tiếp tục chỉnh sửa" onPress={stay} tone="secondary" /><Button label="Bỏ thay đổi" onPress={discard} tone="danger" /></Dialog> : null}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: "#FFF2DB", flex: 1 }, flex: { flex: 1 }, content: { flexGrow: 1, padding: 24, paddingBottom: 32 }, header: { marginBottom: 12 }, title: { color: "#2E2E2E", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 28, lineHeight: 36 }, intro: { color: "#675440", fontFamily: "BeVietnamPro_400Regular", fontSize: 15, lineHeight: 23, marginBottom: 28 }, field: { marginBottom: 22 }, label: { color: "#2E2E2E", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 16, marginBottom: 8 }, input: { backgroundColor: "#FFFFFF", borderColor: "#D9C4A4", borderRadius: radius.sm, borderWidth: 1, color: "#2E2E2E", fontFamily: "BeVietnamPro_400Regular", fontSize: 16, minHeight: 50, paddingHorizontal: 14 }, inputError: { borderColor: colors.danger, borderWidth: 2 }, readonly: { backgroundColor: "#F2E8D8", borderColor: "#D9C4A4", borderRadius: radius.sm, borderWidth: 1, color: "#675440", fontFamily: "BeVietnamPro_400Regular", fontSize: 16, minHeight: 50, paddingHorizontal: 14, paddingTop: 14 }, hint: { color: "#675440", fontFamily: "BeVietnamPro_400Regular", fontSize: 13, lineHeight: 19, marginTop: 6 }, error: { color: colors.danger, fontFamily: "BeVietnamPro_600SemiBold", fontSize: 13, lineHeight: 19, marginTop: 6 }, notice: { backgroundColor: "#FFFFFF", borderRadius: radius.sm, color: "#2E2E2E", fontFamily: "BeVietnamPro_600SemiBold", lineHeight: 22, marginTop: 2, padding: 14 }, errorNotice: { backgroundColor: "#FBE2E2", color: colors.danger }, actions: { backgroundColor: "#FFFFFF", borderTopColor: "#E6CDA8", borderTopWidth: 1, flexDirection: "row", gap: 12, padding: 16 }, secondary: { alignItems: "center", borderColor: "#A84300", borderRadius: radius.sm, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 50 }, secondaryText: { color: "#A84300", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 16 }, primary: { alignItems: "center", backgroundColor: "#A84300", borderRadius: radius.sm, flex: 1, justifyContent: "center", minHeight: 50 }, primaryText: { color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 16 }, pressed: { opacity: 0.55 }, backdrop: { alignItems: "center", backgroundColor: "rgba(46, 46, 46, 0.42)", flex: 1, justifyContent: "center", padding: 24 }, dialog: { backgroundColor: "#FFFFFF", borderRadius: radius.md, maxWidth: 480, padding: 24, width: "100%" }, dialogTitle: { color: "#2E2E2E", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 21 }, dialogCopy: { color: "#675440", fontFamily: "BeVietnamPro_400Regular", fontSize: 15, lineHeight: 23, marginTop: 12 }, dialogActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", marginTop: 22 }, stay: { borderColor: "#A84300", borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11 }, stayText: { color: "#A84300", fontFamily: "BeVietnamPro_600SemiBold" }, discard: { backgroundColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 11 }, discardText: { color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold" },
});
