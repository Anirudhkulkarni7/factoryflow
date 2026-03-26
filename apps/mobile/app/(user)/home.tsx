import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/auth/session";
import { theme } from "../../src/ui/theme";
import { Screen } from "../../src/ui/Screen";
import { clearSelectedPlantId } from "../../src/plant/store";

export default function UserHome() {
  const router = useRouter();
  const { state, signOut } = useAuth();

  const canChangePlant =
    state.status === "signedIn" &&
    Array.isArray(state.user.plantIds) &&
    state.user.plantIds.length > 1;

  return (
    <Screen>
      <View style={styles.shell}>
        <Text style={styles.title}>USER</Text>

        {state.status === "signedIn" && (
          <Text style={styles.meta}>
            {state.user.email ?? state.user.sub} ({state.user.role})
          </Text>
        )}

        {canChangePlant && (
          <Pressable
            style={styles.secondary}
            onPress={async () => {
              await clearSelectedPlantId();
              router.push("/select-plant"); // push so back works
            }}
          >
            <Text style={styles.secondaryText}>Change Plant</Text>
          </Pressable>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, padding: theme.spacing.l, justifyContent: "center" },
  title: { color: theme.colors.text, fontSize: 22, fontWeight: "900" },
  meta: { color: theme.colors.muted, marginTop: 8, marginBottom: 16 },

  secondary: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.xl,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryText: { color: theme.colors.text, fontWeight: "800" },

  button: {
    marginTop: 12,
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: theme.colors.primaryBg,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  buttonText: { color: theme.colors.text, fontWeight: "900" },
});