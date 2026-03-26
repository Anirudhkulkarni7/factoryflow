import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/auth/session";
import { Screen } from "../src/ui/Screen";
import { theme } from "../src/ui/theme";
import { PasswordInput } from "../src/ui/PasswordInput";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, error, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const disabled = loading || !email.trim() || !password;

  const onLogin = async () => {
    clearError();
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/"); // role redirect in app/index.tsx
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        {/* Tap outside to dismiss keyboard like Instagram */}
        <Pressable style={styles.fill} onPress={Keyboard.dismiss}>
          <View style={styles.shell} pointerEvents="box-none">
            <View style={styles.header}>
              <Text style={styles.brand}>FactoryFlow</Text>
              <Text style={styles.tag}>Operations • Forms • Approvals</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Sign in</Text>
              <Text style={styles.sub}>Use your manager/user credentials</Text>

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="name@company.com"
                placeholderTextColor={theme.colors.placeholder}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
              />

              <PasswordInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                onPress={onLogin}
                disabled={disabled}
                style={({ pressed }) => [
                  styles.button,
                  (pressed || disabled) && styles.buttonDim,
                ]}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Signing in..." : "Login"}
                </Text>
              </Pressable>

              <Text style={styles.footer}>
                Secure login • Role-based routing
              </Text>
            </View>

            <View style={styles.bottom}>
              <Text style={styles.bottomText}>
                By continuing you agree to company usage policy
              </Text>
            </View>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  fill: { flex: 1 },
  shell: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.l,
  },

  header: { marginBottom: 18 },
  brand: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  tag: { color: theme.colors.muted, marginTop: 6 },

  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.l,
  },

  title: { color: theme.colors.text, fontSize: 18, fontWeight: "900" },
  sub: { color: theme.colors.muted, marginTop: 6, marginBottom: 16 },

  label: { color: theme.colors.muted, marginBottom: 8, marginTop: 10 },
  input: {
    color: theme.colors.text,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  button: {
    marginTop: 16,
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: theme.colors.primaryBg,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  buttonDim: { opacity: 0.65 },
  buttonText: { color: theme.colors.text, fontWeight: "900", letterSpacing: 0.4 },

  error: { color: theme.colors.danger, marginTop: 10 },
  footer: { marginTop: 14, color: theme.colors.muted, fontSize: 12 },

  bottom: { marginTop: 16, alignItems: "center" },
  bottomText: { color: theme.colors.muted, fontSize: 12 },
});