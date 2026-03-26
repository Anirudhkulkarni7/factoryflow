import { View, Text, StyleSheet } from "react-native";
import { Screen } from "../../src/ui/Screen";
import { theme } from "../../src/ui/theme";

export default function MySubmissions() {
  return (
    <Screen>
      <View style={styles.shell}>
        <Text style={styles.title}>My Submissions</Text>
        <Text style={styles.sub}>Coming next</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, padding: theme.spacing.l, justifyContent: "center" },
  title: { color: theme.colors.text, fontSize: 22, fontWeight: "900" },
  sub: { color: theme.colors.muted, marginTop: 8 },
});