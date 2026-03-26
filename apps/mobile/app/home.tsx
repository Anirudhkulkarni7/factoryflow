import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAuth } from "../src/auth/session";

export default function Home() {
  const { state, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      {state.status === "signedIn" && (
        <Text style={styles.meta}>
          Logged in as: {state.user.email ?? state.user.name ?? state.user.sub} ({state.user.role})
        </Text>
      )}

      <Pressable onPress={() => void signOut()} style={styles.button}>
        <Text style={styles.buttonText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800" },
  meta: { marginTop: 10, marginBottom: 18, opacity: 0.7 },
  button: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "white", fontWeight: "700" },
});