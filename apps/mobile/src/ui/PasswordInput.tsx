import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { theme } from "./theme";

type Props = Readonly<{
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}>;

export function PasswordInput(props: Props) {
  const [show, setShow] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{props.label}</Text>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor="rgba(229,231,235,0.45)"
          secureTextEntry={!show}
        />

        <Pressable onPress={() => setShow((s) => !s)} style={styles.toggle}>
          <Text style={styles.toggleText}>{show ? "HIDE" : "SHOW"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: theme.spacing.s },
  label: { color: theme.colors.muted, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.lg,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggle: { paddingHorizontal: 12, paddingVertical: 10 },
  toggleText: { color: theme.colors.primary, fontWeight: "900", letterSpacing: 0.6 },
});