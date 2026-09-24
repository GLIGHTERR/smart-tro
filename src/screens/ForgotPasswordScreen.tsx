import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useEffect, useRef, useState } from "react";
import { AppState, BackHandler, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  acceptRecoveryChallenge,
  acceptRecoveryVerification,
  applyRecoveryError,
  backRecovery,
  canResendRecoveryOtp,
  completeRecovery,
  createRecoveryState,
  createRecoverySubmissionGuard,
  getRecoveryRetrySeconds,
  getResendSeconds,
  prepareRecoveryEmail,
  prepareRecoveryOtp,
  prepareRecoveryPassword,
  resumeRecovery,
  sanitizeRecoveryOtp,
  type RecoveryState,
  type RecoveryStep,
} from "@/auth/recoveryState";
import { GatewayError, type AuthGateway } from "@/auth/gateway";

type Props = {
  gateway: AuthGateway;
  initialStep?: RecoveryStep;
  onExit: () => void;
  onComplete: (email: string) => void;
};

export function ForgotPasswordScreen({ gateway, initialStep = "email", onExit, onComplete }: Props) {
  const { width, height } = useWindowDimensions();
  const [state, setState] = useState(() => createRecoveryState(initialStep));
  const [now, setNow] = useState(Date.now());
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionGuard = useRef(createRecoverySubmissionGuard()).current;
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appState.current !== "active" && nextState === "active") {
        setShowPassword(false);
        setShowConfirm(false);
        setState((current) => resumeRecovery(current, Date.now()));
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (submitting) return true;
      if (state.step === "email") onExit();
      else setState((current) => backRecovery(current));
      return true;
    });
    return () => subscription.remove();
  }, [onExit, state.step, submitting]);

  const update = (values: Partial<RecoveryState>) => setState((current) => ({ ...current, ...values, error: "" }));
  const runOnce = (operation: () => Promise<void>) => submissionGuard.run(async () => {
    setSubmitting(true);
    try { await operation(); }
    finally { setSubmitting(false); }
  });
  const goBack = () => {
    if (submitting) return;
    setShowPassword(false);
    setShowConfirm(false);
    if (state.step === "email") onExit();
    else setState((current) => backRecovery(current));
  };
  const fail = (cause: unknown) => setState((current) => applyRecoveryError(current, cause instanceof GatewayError ? cause.code : "SERVER_ERROR", cause instanceof GatewayError ? cause.retryAfterSeconds : undefined, Date.now()));
  const submit = () => void runOnce(async () => {
    const timestamp = Date.now();
    if (state.step === "email") {
      const prepared = prepareRecoveryEmail(state);
      setState(prepared.state);
      if (!("value" in prepared)) return;
      try {
        const challenge = await gateway.requestPasswordRecovery(prepared.value);
        setState((current) => acceptRecoveryChallenge(current, prepared.value, challenge));
      } catch (cause) { fail(cause); }
    } else if (state.step === "otp") {
      const prepared = prepareRecoveryOtp(state, timestamp);
      setState(prepared.state);
      if (!("value" in prepared)) return;
      try {
        const credential = await gateway.verifyPasswordRecovery(state.email, state.challengeId, prepared.value);
        setState((current) => acceptRecoveryVerification(current, credential));
      } catch (cause) { fail(cause); }
    } else {
      const prepared = prepareRecoveryPassword(state, timestamp);
      setState(prepared.state);
      if (!("value" in prepared)) return;
      try {
        const result = await gateway.resetPassword(state.resetToken, prepared.value, state.confirmPassword);
        setState(completeRecovery(timestamp));
        setShowPassword(false);
        setShowConfirm(false);
        onComplete(result.email);
      } catch (cause) { fail(cause); }
    }
  });
  const resend = () => void runOnce(async () => {
    const timestamp = Date.now();
    if (!canResendRecoveryOtp(state, timestamp)) return;
    try {
      const challenge = await gateway.requestPasswordRecovery(state.email);
      setState((current) => acceptRecoveryChallenge(current, state.email, challenge));
    } catch (cause) { fail(cause); }
  });
  const resendSeconds = getResendSeconds(state, now);
  const retrySeconds = getRecoveryRetrySeconds(state, now);
  const actionLabel = state.step === "email" ? "Gửi OTP" : state.step === "otp" ? "Tiếp tục" : "Xác nhận";
  const formWidth = width < 400 ? Math.min(290, width - 40) : Math.min(320, width - 96);

  return <View style={styles.backdrop}>
    <SafeAreaView style={[styles.canvas, { width: Math.min(width, 430) }]}>
      <Pressable accessibilityLabel="Quay lại" accessibilityRole="button" onPress={goBack} style={[styles.back, height < 650 && styles.compactBack]}>
        <FontAwesome color="#FFFFFF" name="chevron-left" size={19} />
      </Pressable>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: height < 650 ? 18 : 70 }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, height < 650 && styles.compactHeader]}><Text style={styles.title}>Quên mật{`\n`}khẩu</Text></View>
        <View style={[styles.form, { width: formWidth }, height < 650 && styles.compactForm]}>
          {state.step === "email" && <RecoveryInput editable={!submitting} label="Email" value={state.email} onChangeText={(email) => update({ email })} type="email-address" />}
          {state.step === "otp" && <RecoveryInput editable={!submitting} label="Mã OTP" value={state.otp} onChangeText={(otp) => update({ otp: sanitizeRecoveryOtp(otp) })} type="numeric" />}
          {state.step === "password" && <>
            <SecretRecoveryInput editable={!submitting} label="Mật khẩu" value={state.password} visible={showPassword} onChangeText={(password) => update({ password })} onToggle={() => setShowPassword((visible) => !visible)} />
            <SecretRecoveryInput editable={!submitting} label="Nhập lại mật khẩu" value={state.confirmPassword} visible={showConfirm} onChangeText={(confirmPassword) => update({ confirmPassword })} onToggle={() => setShowConfirm((visible) => !visible)} />
          </>}
          {!!state.notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{state.notice}</Text>}
          {!!state.error && <Text accessibilityLiveRegion="polite" style={styles.error}>{state.error}</Text>}
          {state.step === "otp" && <RecoveryAction
            disabled={submitting || resendSeconds > 0}
            label={resendSeconds ? `Gửi lại mã OTP (${resendSeconds}s)` : "Gửi lại mã OTP"}
            onPress={resend}
          />}
          <RecoveryAction
            disabled={submitting || retrySeconds > 0 || (state.step === "otp" && state.otp.length !== 6)}
            label={submitting ? "Đang xử lý..." : retrySeconds ? `${actionLabel} (${retrySeconds}s)` : actionLabel}
            onPress={submit}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>;
}

function RecoveryInput({ editable, label, value, onChangeText, type = "default" }: { editable: boolean; label: string; value: string; onChangeText: (value: string) => void; type?: "default" | "email-address" | "numeric" }) {
  return <TextInput accessibilityLabel={label} autoCapitalize="none" autoCorrect={false} editable={editable} keyboardType={type} onChangeText={onChangeText} placeholder={label} placeholderTextColor="#A78B68" style={styles.input} value={value} />;
}

function SecretRecoveryInput({ editable, label, value, visible, onChangeText, onToggle }: { editable: boolean; label: string; value: string; visible: boolean; onChangeText: (value: string) => void; onToggle: () => void }) {
  return <View style={styles.secret}>
    <TextInput accessibilityLabel={label} autoCapitalize="none" editable={editable} onChangeText={onChangeText} placeholder={label} placeholderTextColor="#A78B68" secureTextEntry={!visible} style={styles.secretInput} value={value} />
    <Pressable accessibilityLabel={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} disabled={!editable} onPress={onToggle} style={styles.eye}><FontAwesome color="#A84300" name={visible ? "eye-slash" : "eye"} size={17} /></Pressable>
  </View>;
}

function RecoveryAction({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, disabled && styles.disabled]}><Text style={styles.actionText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  backdrop: { alignItems: "center", backgroundColor: "#FF9A05", flex: 1 },
  canvas: { backgroundColor: "#FF9A05", flex: 1 },
  back: { alignItems: "center", height: 44, justifyContent: "center", left: 12, position: "absolute", top: 40, width: 44, zIndex: 2 },
  compactBack: { top: 6 },
  content: { alignItems: "center", flexGrow: 1, paddingBottom: 22 },
  header: { alignItems: "center", justifyContent: "center", minHeight: 144, width: "100%" },
  compactHeader: { minHeight: 112 },
  title: { color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 48, lineHeight: 71, textAlign: "center" },
  form: { marginTop: 28 },
  compactForm: { marginTop: 14 },
  input: { backgroundColor: "#FBC97E", borderRadius: 24, color: "#5B4126", fontFamily: "BeVietnamPro_400Regular", fontSize: 15, height: 48, marginBottom: 16, paddingHorizontal: 28 },
  secret: { backgroundColor: "#FBC97E", borderRadius: 24, height: 48, marginBottom: 16 },
  secretInput: { color: "#5B4126", fontFamily: "BeVietnamPro_400Regular", fontSize: 15, height: 48, paddingHorizontal: 28, paddingRight: 54 },
  eye: { height: 48, justifyContent: "center", position: "absolute", right: 18 },
  action: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#1684F7", borderRadius: 9, borderWidth: 1.5, height: 33, justifyContent: "center", marginTop: 10 },
  actionText: { color: "#F09200", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 14 },
  disabled: { opacity: 0.55 },
  notice: { color: "#5B4126", fontFamily: "BeVietnamPro_400Regular", fontSize: 12, lineHeight: 18, marginBottom: 2, textAlign: "center" },
  error: { color: "#8B1C1C", fontFamily: "BeVietnamPro_400Regular", fontSize: 12, lineHeight: 18, marginBottom: 2, textAlign: "center" },
});
