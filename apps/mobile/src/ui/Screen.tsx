import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { theme } from "./theme";

export function Screen(props: Readonly<{ children: React.ReactNode }>) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 6000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 6000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.11, 0.16],
  });

  return (
    <View style={styles.root}>
      {/* soft red glow (very subtle) */}
      <Animated.View
        pointerEvents="none"
        style={[styles.glow, { opacity: glowOpacity }]}
      />

      {/* vignette */}
      <View pointerEvents="none" style={styles.vignette} />

      <View style={styles.inner}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  inner: { flex: 1 },

  glow: {
    position: "absolute",
    top: -140,
    left: -140,
    width: 360,
    height: 360,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },

  vignette: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
});