import { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, Pressable, View } from "react-native";

import { createHttpClient } from "@/api/http";
import { createRenterApi } from "@/api/renter";
import { useAuth } from "@/auth/AuthProvider";
import { validateAuthForm } from "@/auth/validation";
import { Button, Field } from "@/ui/components";
import { colors, radius, spacing } from "@/theme/tokens";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();
  const api = useMemo(() => createRenterApi(createHttpClient(async () => null)), []);
  const isRegister = mode === "register";

  async function submit() {
    const errors = validateAuthForm({ name, email, password }, isRegister);
    if (Object.keys(errors).length) { setError(Object.values(errors)[0] ?? "Check your details."); return; }
    setError(""); setSubmitting(true);
    try {
      const response = isRegister ? await api.register(name.trim(), email, password) : await api.signIn(email, password);
      await signIn(response.accessToken);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to sign in right now."); }
    finally { setSubmitting(false); }
  }

  return <SafeAreaView style={styles.page}><View style={styles.hero}><Text style={styles.kicker}>SMART TRO</Text><Text style={styles.title}>{isRegister ? "Find your next place." : "A better way home."}</Text><Text style={styles.copy}>Simple, dependable tools for renters.</Text></View><View style={styles.card}>{isRegister ? <Field label="Name" value={name} onChangeText={setName} /> : null}<Field label="Email" value={email} onChangeText={setEmail} /><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />{error ? <Text style={styles.error}>{error}</Text> : null}<Button label={submitting ? "Please wait..." : isRegister ? "Create account" : "Sign in"} onPress={() => void submit()} disabled={submitting} /><Pressable onPress={() => { setMode(isRegister ? "login" : "register"); setError(""); }}><Text style={styles.switch}>{isRegister ? "Already have an account? Sign in" : "New here? Create an account"}</Text></Pressable></View></SafeAreaView>;
}
const styles = StyleSheet.create({ page: { backgroundColor: colors.canvas, flex: 1, justifyContent: "space-between", padding: spacing.lg }, hero: { gap: spacing.sm, paddingTop: spacing.xl }, kicker: { color: colors.primary, fontSize: 13, fontWeight: "800", letterSpacing: 2 }, title: { color: colors.ink, fontSize: 40, fontWeight: "800", letterSpacing: -1 }, copy: { color: colors.muted, fontSize: 16 }, card: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.md, padding: spacing.lg }, error: { color: colors.danger }, switch: { color: colors.primary, fontWeight: "700", textAlign: "center" } });
