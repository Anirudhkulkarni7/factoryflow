import { View, Text, StyleSheet } from "react-native";
import { Screen } from "../../src/ui/Screen";
import { theme } from "../../src/ui/theme";

export default function ManagerProfile() {
  return (
    <Screen>
      <View style={styles.shell}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.sub}>Settings + Change Plant + Logout</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, padding: theme.spacing.l, justifyContent: "center" },
  title: { color: theme.colors.text, fontSize: 22, fontWeight: "900" },
  sub: { color: theme.colors.muted, marginTop: 8 },
});