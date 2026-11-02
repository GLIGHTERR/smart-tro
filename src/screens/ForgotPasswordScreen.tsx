import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useEffect, useRef, useState } from "react";
import { AppState, BackHandler, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
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
  maskRecoveryEmail,
  prepareRecoveryEmail,
  prepareRecoveryOtp,
  prepareRecoveryPassword,
  returnToRecoveryEmail,
  resumeRecovery,
  sanitizeRecoveryOtp,
  type RecoveryState,
  type RecoveryStep,
} from "@/auth/recoveryState";
import { GatewayError, type AuthGateway } from "@/auth/gateway";
import { AuthButton, AuthField, AuthLink } from "@/ui";

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
  const [focusEmail, setFocusEmail] = useState(false);
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
      if (state.step === "email") onExit();
      else {
        submissionGuard.cancel();
        setSubmitting(false);
        setShowPassword(false);
        setShowConfirm(false);
        setFocusEmail(true);
        setState((current) => backRecovery(current));
      }
      return true;
    });
    return () => subscription.remove();
  }, [onExit, state.step, submissionGuard]);

  const update = (values: Partial<RecoveryState>) => setState((current) => ({ ...current, ...values, error: "" }));
  const runOnce = (operation: (isCurrent: () => boolean) => Promise<void>) => submissionGuard.run(async (isCurrent) => {
    setSubmitting(true);
    try { await operation(isCurrent); }
    finally { if (isCurrent()) setSubmitting(false); }
  });
  const clearLocalOtpState = () => {
    submissionGuard.cancel();
    setSubmitting(false);
    setShowPassword(false);
    setShowConfirm(false);
    setFocusEmail(true);
  };
  const changeEmail = () => {
    clearLocalOtpState();
    setState((current) => returnToRecoveryEmail(current));
  };
  const goBack = () => {
    if (state.step === "email") onExit();
    else {
      clearLocalOtpState();
      setState((current) => backRecovery(current));
    }
  };
  const fail = (cause: unknown, isCurrent: () => boolean) => {
    if (!isCurrent()) return;
    setState((current) => applyRecoveryError(current, cause instanceof GatewayError ? cause.code : "SERVER_ERROR", cause instanceof GatewayError ? cause.retryAfterSeconds : undefined, Date.now()));
  };
  const submit = () => void runOnce(async (isCurrent) => {
    const timestamp = Date.now();
    if (state.step === "email") {
      const prepared = prepareRecoveryEmail(state);
      setState(prepared.state);
      if (!("value" in prepared)) return;
      try {
        const challenge = await gateway.requestPasswordRecovery(prepared.value);
        if (!isCurrent()) return;
        setFocusEmail(false);
        setState((current) => acceptRecoveryChallenge(current, prepared.value, challenge));
      } catch (cause) { fail(cause, isCurrent); }
    } else if (state.step === "otp") {
      const prepared = prepareRecoveryOtp(state, timestamp);
      setState(prepared.state);
      if (!("value" in prepared)) return;
      try {
        const credential = await gateway.verifyPasswordRecovery(state.email, state.challengeId, prepared.value);
        if (!isCurrent()) return;
        setState((current) => acceptRecoveryVerification(current, credential));
      } catch (cause) { fail(cause, isCurrent); }
    } else {
      const prepared = prepareRecoveryPassword(state, timestamp);
      setState(prepared.state);
      if (!("value" in prepared)) return;
      try {
        const result = await gateway.resetPassword(state.resetToken, prepared.value, state.confirmPassword);
        if (!isCurrent()) return;
        setState(completeRecovery(timestamp));
        setShowPassword(false);
        setShowConfirm(false);
        onComplete(result.email);
      } catch (cause) { fail(cause, isCurrent); }
    }
  });
  const resend = () => void runOnce(async (isCurrent) => {
    const timestamp = Date.now();
    if (!canResendRecoveryOtp(state, timestamp)) return;
    try {
      const challenge = await gateway.requestPasswordRecovery(state.email);
      if (!isCurrent()) return;
      setState((current) => acceptRecoveryChallenge(current, state.email, challenge));
    } catch (cause) { fail(cause, isCurrent); }
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
          {state.step === "email" && <AuthField autoFocus={focusEmail} editable={!submitting} keyboardType="email-address" label="Email" selectTextOnFocus={focusEmail} value={state.email} onChangeText={(email) => update({ email })} />}
          {state.step === "otp" && <>
            <View style={styles.otpDestination}>
              <Text style={styles.otpDestinationCopy}>Mã xác thực đã được gửi tới</Text>
              <Text style={styles.maskedEmail}>{maskRecoveryEmail(state.email)}</Text>
              <AuthLink label="Đổi email" onPress={changeEmail} />
            </View>
            <AuthField editable={!submitting} keyboardType="numeric" label="Mã OTP" value={state.otp} onChangeText={(otp) => update({ otp: sanitizeRecoveryOtp(otp) })} />
          </>}
          {state.step === "password" && <>
            <AuthField editable={!submitting} label="Mật khẩu" passwordVisible={showPassword} secureTextEntry value={state.password} onChangeText={(password) => update({ password })} onTogglePassword={() => setShowPassword((visible) => !visible)} />
            <AuthField editable={!submitting} label="Nhập lại mật khẩu" passwordVisible={showConfirm} secureTextEntry value={state.confirmPassword} onChangeText={(confirmPassword) => update({ confirmPassword })} onTogglePassword={() => setShowConfirm((visible) => !visible)} />
          </>}
          {!!state.notice && state.step !== "otp" && <Text accessibilityLiveRegion="polite" style={styles.notice}>{state.notice}</Text>}
          {!!state.error && <Text accessibilityLiveRegion="polite" style={styles.error}>{state.error}</Text>}
          <AuthButton
            disabled={submitting || retrySeconds > 0 || (state.step === "otp" && state.otp.length !== 6)}
            label={submitting ? "Đang xử lý..." : retrySeconds ? `${actionLabel} (${retrySeconds}s)` : actionLabel}
            onPress={submit}
          />
          {state.step === "otp" && <AuthButton
            disabled={submitting || resendSeconds > 0}
            label={resendSeconds ? `Gửi lại mã OTP (${resendSeconds}s)` : "Gửi lại mã OTP"}
            onPress={resend}
            variant="secondary"
          />}
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>;
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
  otpDestination: { alignItems: "center", marginBottom: 4 },
  otpDestinationCopy: { color: "#FFFFFF", fontFamily: "BeVietnamPro_400Regular", fontSize: 12, lineHeight: 18, textAlign: "center" },
  maskedEmail: { color: "#FFFFFF", fontFamily: "BeVietnamPro_600SemiBold", fontSize: 12, lineHeight: 18, textAlign: "center" },
  notice: { color: "#5B4126", fontFamily: "BeVietnamPro_400Regular", fontSize: 12, lineHeight: 18, marginBottom: 2, textAlign: "center" },
  error: { color: "#8B1C1C", fontFamily: "BeVietnamPro_400Regular", fontSize: 12, lineHeight: 18, marginBottom: 2, textAlign: "center" },
});
