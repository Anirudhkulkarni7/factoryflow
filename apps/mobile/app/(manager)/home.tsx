import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/auth/session";

export default function ManagerHome() {
  const router = useRouter();
  const { state, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MANAGER Home</Text>
      {state.status === "signedIn" && (
        <Text style={styles.meta}>
          {state.user.email ?? state.user.sub} ({state.user.role})
        </Text>
      )}

      <Pressable
        onPress={async () => {
          await signOut();
          router.replace("/login");
        }}
        style={styles.button}
      >
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